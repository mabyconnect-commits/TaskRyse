# Taskryse — Backend

A global AI/digital-work platform. Contributors complete verified tasks; businesses
sponsor and fund them; reviewers grade; support and admins operate. Nigeria-first (₦),
multi-currency.

This repository is the **backend** built from the design handoff (`BACKEND_SPEC.md`,
`prisma/schema.prisma`, `openapi.yaml`). The HTML prototypes in `design/` are visual
reference only — they are not rebuilt here. This service implements the data model,
migrations, REST API, auth, RBAC and the money business rules the frontend will consume.

Stack: **Node.js + Express + Prisma (PostgreSQL)**. Money is stored in **minor units**
(kobo/cents) as `Int`/`BigInt` — never as floats.

## The one rule that is enforced server-side

> A plan unlocks **eligibility only**. It never grants tasks, earnings or returns.
> Earnings exist only after a submission is **approved** by review, and become
> **withdrawable** only after the sponsor's escrow for that task is funded. Promotional
> credits are a **separate, non-withdrawable** balance.

Where this lives in the code:

- `src/lib/wallet.js` — the ledger. `recordSubscription()` touches no earning field;
  `addPromoCredit()` only ever writes `promoCreditMinor`; `approveEarning()` is the only
  path that increases `withdrawableMinor`.
- `src/routes/review.js` — approval releases pending → withdrawable **only** when the
  task's escrow (`escrowFundedMinor − escrowSpentMinor`) covers the pay; otherwise the
  approval stands but the money stays pending.
- `src/lib/eligibility.js` — plans grant category/level/sponsored access, nothing more.
- `src/lib/ryse.js` — Ryse level is **derived** from approved work + quality +
  qualifications, never from spend or referrals.

## Quick start

```bash
# 1. Postgres must be running; set DATABASE_URL in .env (see .env.example)
cp .env.example .env            # then edit DATABASE_URL / JWT_SECRET

npm install
npx prisma migrate dev          # create schema
npx prisma db seed              # load demo data (plans, countries, a funded task, users)

npm start                       # API on http://localhost:4000
```

### Demo logins (password `Password123!`)

| Role        | Email                   | Notes                       |
|-------------|-------------------------|-----------------------------|
| Contributor | `adaeze@example.com`    | withdrawal PIN `1234`       |
| Reviewer    | `reviewer@taskryse.com` |                             |
| Sponsor     | `sponsor@meridian.ai`   | owner of "Meridian AI Labs" |
| Admin       | `admin@taskryse.com`    |                             |

## Testing

```bash
# Unit test of the escrow-gate safety rule (no server needed):
node --test test/escrow.test.js

# Full end-to-end money-lifecycle smoke test (requires a running, freshly-seeded server):
npm start &                     # in one shell
bash test/smoke.sh              # in another
```

The smoke test walks the whole lifecycle and asserts each rule: submit → pending,
approve → withdrawable (escrow funded), withdraw (PIN+OTP, fee applied), failed
withdrawal → reversed, plan purchase → **zero earnings**, promo credit stays separate,
audit log populated, and non-admins blocked from `/admin/*`.

## API

Base path: `/api/v1`. Auth: `Authorization: Bearer <JWT>` (from `/auth/login` or
`/auth/otp/verify`). The full contract is in [`openapi.yaml`](./openapi.yaml).

| Area | Endpoints |
|------|-----------|
| Auth/onboarding | `POST /auth/register`, `/auth/otp/verify`, `/auth/login`, `/auth/reset`, `POST /kyc`, `/kyc/liveness`, `/payout-methods`, `/assessments/intro` |
| Plans | `GET /plans`, `POST /subscriptions`, `/subscriptions/:id/upgrade\|downgrade\|cancel`, `POST /coupons/validate` |
| Marketplace | `GET /tasks` (per-caller eligibility), `GET /tasks/:id`, `POST /tasks/:id/accept`, `POST /qualifications/:id/attempt` |
| Workspace | `PATCH /assignments/:id/autosave`, `POST /assignments/:id/submit`, `/assignments/:id/clarification`, `POST /tasks/:id/report` |
| Review | `GET /review-queue`, `POST /submissions/:id/approve\|revision\|reject\|flag`, `POST /reviews/:id/escalate`, `POST /submissions/:id/appeal` |
| Wallet/money | `GET /wallet`, `/transactions`, `POST /withdrawals` (PIN+OTP), `GET /withdrawals/:id`, `POST /bills/verify-customer`, `/bills/pay` |
| Growth | `GET /ryse-level`, `/learning`, `POST /referrals`, `GET /sponsored`, `POST /sponsored/:id/hide\|report` |
| Business | `POST /orgs`, `/orgs/verify`, `/campaigns`, `/campaigns/:id/fund`, `GET /campaigns/:id/analytics`, `/invoices` |
| Support/Admin | `GET/POST /tickets`, `GET /admin/kyc-queue`, `POST /admin/kyc/:id/decision`, `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/release\|hold`, `GET /admin/fraud`, `POST /admin/fraud/:id/freeze\|clear`, `GET/POST /admin/plans\|countries\|content\|roles`, `GET /admin/audit-log` |

Every mutation on `/admin/*` and on money endpoints appends an immutable
`audit_log` row (`src/lib/audit.js`).

## Roles & permissions (RBAC)

Scopes are defined per role in `src/lib/rbac.js` and enforced per endpoint via
`requireScope()` / `requireRole()` (`src/middleware/authorize.js`).

| Role | Highlights |
|------|-----------|
| Contributor | browse eligible tasks, accept, submit, withdraw, pay bills, learn, refer, dispute |
| Sponsor | create+fund tasks/campaigns, define eligibility, review own org's submissions, analytics |
| Reviewer | work the review queue, approve/reject/revision, flag fraud, escalate — no payment amounts, no self-review |
| Support | tickets/disputes, escalate, resolve, raise refund requests — no KYC/plan/money changes |
| Admin | everything, permission-gated; every privileged mutation is audit-logged |

## Money lifecycle (as implemented)

1. **Submit** → task pay appears as `pendingMinor` (not withdrawable).
2. **Approve** → `pending` → `approved`/`withdrawable`, **iff** task escrow funded; escrow is spent.
3. **Reject / revision** → no money moves; the staged pending is removed; contributor may appeal/resubmit.
4. **Withdraw** → requires PIN + OTP; deducts `withdrawable` + fee; `processing → completed | failed_reversed` (reversal refunds in full).
5. **Bill pay** → deducts `withdrawable`; `successful | pending | reversed_refunded` (reversal refunds).
6. **Plan purchase** → records the spend only, **creates zero earnings**; 7-day refund window while no task accepted; grace bookkeeping on renewal.

## Project layout

```
prisma/schema.prisma     data model (Postgres, money in minor units)
prisma/seed.js           demo data mirroring the design
src/app.js               express app + route wiring
src/server.js            entrypoint
src/lib/                 prisma, auth, rbac, wallet ledger, eligibility, ryse, audit, errors
src/middleware/          authenticate, authorize, asyncHandler, errorHandler
src/routes/              auth, account, plans, marketplace, workspace, review,
                         wallet, growth, business, support, admin
test/                    escrow.test.js (rule unit test), smoke.sh (e2e)
design/                  HTML prototypes — visual reference only
```

## Copy rules

Generated/user-facing copy follows `BACKEND_SPEC.md §5`: allowed framing is
"unlock eligible task categories", "earn from approved submissions", "payment depends
on successful completion and approval". Forbidden anywhere: "invest and earn",
"guaranteed returns", "passive/daily income", "risk-free", "buy a plan and receive
fixed earnings".
