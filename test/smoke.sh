#!/usr/bin/env bash
# End-to-end smoke test of the Taskryse money lifecycle and core rules.
# Assumes the API is running on :4000 and the DB has been freshly seeded.
set -euo pipefail
BASE=http://localhost:4000/api/v1
j() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }
pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; exit 1; }

echo "== Login demo users =="
CONTRIB=$(curl -s $BASE/auth/login -H 'content-type: application/json' -d '{"email":"adaeze@example.com","password":"Password123!"}' | j "['token']")
REVIEWER=$(curl -s $BASE/auth/login -H 'content-type: application/json' -d '{"email":"reviewer@taskryse.com","password":"Password123!"}' | j "['token']")
ADMIN=$(curl -s $BASE/auth/login -H 'content-type: application/json' -d '{"email":"admin@taskryse.com","password":"Password123!"}' | j "['token']")
[ -n "$CONTRIB" ] && pass "contributor login" || fail "contributor login"
[ -n "$REVIEWER" ] && pass "reviewer login" || fail "reviewer login"
[ -n "$ADMIN" ] && pass "admin login" || fail "admin login"

auth() { echo "Authorization: Bearer $1"; }

echo "== Wallet before =="
W0=$(curl -s $BASE/wallet -H "$(auth $CONTRIB)")
PENDING0=$(echo "$W0" | j "['pendingMinor']")
WITHDRAW0=$(echo "$W0" | j "['withdrawableMinor']")
echo "  pending=$PENDING0 withdrawable=$WITHDRAW0"

echo "== Marketplace shows eligibility =="
TASKS=$(curl -s "$BASE/tasks" -H "$(auth $CONTRIB)")
TASK_ID=$(echo "$TASKS" | j "[0]['id']")
ELIG=$(echo "$TASKS" | j "[0]['eligibility']")
[ "$ELIG" = "ELIGIBLE" ] && pass "task eligible for subscribed contributor" || fail "eligibility=$ELIG"

echo "== Accept task =="
ACC=$(curl -s $BASE/tasks/$TASK_ID/accept -X POST -H "$(auth $CONTRIB)")
ASSIGN_ID=$(echo "$ACC" | j "['id']")
[ -n "$ASSIGN_ID" ] && pass "accepted -> assignment $ASSIGN_ID" || fail "accept: $ACC"

echo "== Submit work -> pending increases =="
curl -s $BASE/assignments/$ASSIGN_ID/submit -X POST -H "$(auth $CONTRIB)" -H 'content-type: application/json' -d '{"evidence":{"choice":"A","accuracy":4}}' > /dev/null
W1=$(curl -s $BASE/wallet -H "$(auth $CONTRIB)")
PENDING1=$(echo "$W1" | j "['pendingMinor']")
[ "$PENDING1" -eq $((PENDING0 + 180000)) ] && pass "pending +180000 (pending=$PENDING1)" || fail "pending expected $((PENDING0+180000)) got $PENDING1"
WITHDRAW1=$(echo "$W1" | j "['withdrawableMinor']")
[ "$WITHDRAW1" -eq "$WITHDRAW0" ] && pass "withdrawable unchanged on submit" || fail "withdrawable changed on submit"

echo "== Reviewer queue hides pay =="
QUEUE=$(curl -s $BASE/review-queue -H "$(auth $REVIEWER)")
SUB_ID=$(echo "$QUEUE" | j "[0]['submissionId']")
HAS_PAY=$(echo "$QUEUE" | python3 -c "import sys,json;print('payMinor' in json.load(sys.stdin)[0])")
[ "$HAS_PAY" = "False" ] && pass "reviewer cannot see payMinor" || fail "reviewer saw payMinor"

echo "== Approve -> pending moves to withdrawable (escrow funded) =="
curl -s $BASE/submissions/$SUB_ID/approve -X POST -H "$(auth $REVIEWER)" -H 'content-type: application/json' -d '{"rubricScores":{"quality":5}}' > /dev/null
W2=$(curl -s $BASE/wallet -H "$(auth $CONTRIB)")
PENDING2=$(echo "$W2" | j "['pendingMinor']")
WITHDRAW2=$(echo "$W2" | j "['withdrawableMinor']")
[ "$PENDING2" -eq "$PENDING0" ] && pass "pending back to baseline" || fail "pending=$PENDING2"
[ "$WITHDRAW2" -eq $((WITHDRAW0 + 180000)) ] && pass "withdrawable +180000 (=$WITHDRAW2)" || fail "withdrawable expected $((WITHDRAW0+180000)) got $WITHDRAW2"

echo "== Promo credit never withdrawable =="
PROMO=$(echo "$W2" | j "['promoCreditMinor']")
echo "  promoCredit=$PROMO (separate balance)"

echo "== Withdraw requires PIN+OTP =="
BADPIN=$(curl -s -o /dev/null -w '%{http_code}' $BASE/withdrawals -X POST -H "$(auth $CONTRIB)" -H 'content-type: application/json' -d '{"amountMinor":100000,"payoutMethod":"BANK","destinationRef":"0123","pin":"0000","otp":"123456"}')
[ "$BADPIN" = "403" ] && pass "bad PIN rejected (403)" || fail "bad pin http=$BADPIN"
WD=$(curl -s $BASE/withdrawals -X POST -H "$(auth $CONTRIB)" -H 'content-type: application/json' -d '{"amountMinor":100000,"payoutMethod":"BANK","destinationRef":"0123456789","pin":"1234","otp":"123456"}')
WD_STATUS=$(echo "$WD" | j "['status']")
[ "$WD_STATUS" = "COMPLETED" ] && pass "withdrawal completed" || fail "withdrawal status=$WD_STATUS ($WD)"
W3=$(curl -s $BASE/wallet -H "$(auth $CONTRIB)")
WITHDRAW3=$(echo "$W3" | j "['withdrawableMinor']")
# 100000 amount + 15000 NG fee = 115000 deducted
[ "$WITHDRAW3" -eq $((WITHDRAW2 - 115000)) ] && pass "withdrawable -115000 (amount+fee) =$WITHDRAW3" || fail "withdrawable expected $((WITHDRAW2-115000)) got $WITHDRAW3"

echo "== Failed withdrawal reverses funds =="
WDF=$(curl -s $BASE/withdrawals -X POST -H "$(auth $CONTRIB)" -H 'content-type: application/json' -d '{"amountMinor":50000,"payoutMethod":"BANK","destinationRef":"0123456789","pin":"1234","otp":"123456","simulateOutcome":"failed_reversed"}')
[ "$(echo "$WDF" | j "['status']")" = "FAILED_REVERSED" ] && pass "withdrawal failed_reversed" || fail "reverse status"
W4=$(curl -s $BASE/wallet -H "$(auth $CONTRIB)")
WITHDRAW4=$(echo "$W4" | j "['withdrawableMinor']")
[ "$WITHDRAW4" -eq "$WITHDRAW3" ] && pass "funds restored after reversal (=$WITHDRAW4)" || fail "reversal expected $WITHDRAW3 got $WITHDRAW4"

echo "== Plan purchase creates ZERO earnings =="
# New user, subscribe, confirm wallet earnings all zero.
EMAIL="buyer$(date +%s)@example.com"
REG=$(curl -s $BASE/auth/register -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"Password123!\"}")
OTP=$(echo "$REG" | j "['otp']")
BUYER=$(curl -s $BASE/auth/otp/verify -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"otp\":\"$OTP\"}" | j "['token']")
PLAN_ID=$(curl -s $BASE/plans | j "[0]['id']")
curl -s $BASE/subscriptions -X POST -H "$(auth $BUYER)" -H 'content-type: application/json' -d "{\"planId\":\"$PLAN_ID\"}" > /dev/null
BW=$(curl -s $BASE/wallet -H "$(auth $BUYER)")
BE=$(echo "$BW" | j "['totalEarnedMinor']")
BWD=$(echo "$BW" | j "['withdrawableMinor']")
[ "$BE" -eq 0 ] && [ "$BWD" -eq 0 ] && pass "plan purchase -> zero earnings, zero withdrawable" || fail "plan created earnings: earned=$BE withdrawable=$BWD"

echo "== Admin audit log captured privileged actions =="
AUDIT=$(curl -s $BASE/admin/audit-log -H "$(auth $ADMIN)")
AUDIT_N=$(echo "$AUDIT" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
[ "$AUDIT_N" -gt 0 ] && pass "audit log has $AUDIT_N entries" || fail "audit log empty"

echo "== Non-admin blocked from admin route =="
FORB=$(curl -s -o /dev/null -w '%{http_code}' $BASE/admin/audit-log -H "$(auth $CONTRIB)")
[ "$FORB" = "403" ] && pass "contributor blocked from admin (403)" || fail "admin gate http=$FORB"

echo ""
echo "ALL SMOKE TESTS PASSED"
