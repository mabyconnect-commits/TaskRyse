# Taskryse Backend Specification

A global AI/digital-work platform. Contributors complete verified tasks; businesses sponsor and fund them; reviewers grade; support and admins operate. Nigeria-first (₦), multi-currency.

Build the backend to satisfy this spec. The HTML files in `design/` show what the frontend will look like — do not rebuild them; build the API that feeds them.

---

## 1. Roles & permissions

| Role | Can | Never |
|------|-----|-------|
| **Contributor** | Browse eligible tasks, accept, submit work, withdraw, pay bills, learn, refer, dispute | See others' earnings, review own work, moderate |
| **Business/Sponsor** | Create+fund tasks & campaigns, define eligibility, review submissions, request revisions, view analytics | See contributor KYC docs, withdraw contributor funds |
| **Reviewer** | Work a review queue, approve/reject/request-revision, flag fraud, escalate | See payment amounts, review tasks they contributed to |
| **Support Agent** | View tickets/disputes + contributor context, escalate, resolve, raise refund requests | Approve KYC, change plans, move money directly |
| **Administrator** | Everything, permission-gated: users, KYC, payouts, fees, currencies, moderation, audit | Act without an audit-log entry |

Use RBAC with per-endpoint permission scopes. Every privileged mutation writes an immutable `audit_log` row.

---

## 2. Core entities (data model)

### User
`id, email (unique), phone, password_hash, role, legal_name, username (unique), photo_url, country_code, languages[], skills[], availability, bio, created_at, status (active|frozen|deleted)`

### KycRecord
`id, user_id, id_type, id_document_url, liveness_status (pending|passed|failed), risk_level (low|med|high), decision (pending|approved|rejected), reviewed_by, decided_at`

### Plan
`id, name (Starter|Riser|Professional|Expert), price_minor, currency, billing_period (monthly|annual), max_active_applications, category_scope[], qualification_access, support_tier, sponsored_access (bool), is_live (bool)`
> Price/config controls **eligibility only**. Never reference earnings.

### Subscription
`id, user_id, plan_id, status (active|grace|expired|cancelled), started_at, renews_at, grace_until, coupon_code`

### TaskCategory
`id, family (ai_data|professional|sponsored), name, slug`

### Task
`id, sponsor_org_id, category_id, title, description, instructions, difficulty (beginner|intermediate|expert), pay_minor, currency, deadline, total_slots, slots_taken, min_ryse_level, countries[], required_skills[], requires_qualification (bool), review_type (manual|auto|team), is_sponsored (bool), sponsor_verified (bool), status (draft|live|paused|closed)`

### TaskApplication / Assignment
`id, task_id, contributor_id, status (accepted|in_progress|draft|submitted|under_review|revision_requested|approved|rejected|disputed|expired|cancelled), accepted_at, deadline, autosave_payload (json), submitted_at`

### Submission
`id, assignment_id, evidence (json/files[]), auto_checks (json), submitted_at, review_id`

### Review
`id, submission_id, reviewer_id, rubric_scores (json), decision (approved|revision|rejected|flagged), note, decided_at, appeal_id?`

### Appeal
`id, submission_id, contributor_id, reason, status (open|under_review|upheld|overturned), second_reviewer_id, resolved_at`

### Qualification & QualificationAttempt
`Qualification: id, category_id, pass_threshold`
`Attempt: id, user_id, qualification_id, score, passed (bool), taken_at, retake_after`

### RyseLevel (derived, not purchasable)
Levels: New → Active → Skilled → Pro → Elite Ryser. Computed from approved_task_count, quality_score, on_time_rate, qualifications_passed, policy_compliance. **Never** from spend or referrals.

### Wallet & WalletEntry (double-entry ledger)
`Wallet: user_id, currency, total_earned_minor, approved_minor, pending_minor, withdrawable_minor, promo_credit_minor (separate!), refund_minor`
`WalletEntry: id, wallet_id, type (task_payment|withdrawal|bill|subscription|refund|promo|fee), related_task_id, gross_minor, fee_minor, exchange_rate, net_minor, currency, status, reference, created_at`
> `promo_credit_minor` is **never** included in `withdrawable_minor`.

### Withdrawal
`id, user_id, amount_minor, fee_minor, currency, payout_method (bank|mobile_money|paypal|stablecoin), destination_ref, status (processing|completed|failed_reversed|held_compliance), otp_verified, pin_verified, reference, created_at`

### BillPayment
`id, user_id, service (airtime|data|electricity|cable|internet|education), provider, customer_ref, amount_minor, status (successful|pending|reversed_refunded), token_ref, created_at`

### Organisation (sponsor)
`id, name, verification_status, escrow_balance_minor, team_members[] (user_id, role, scopes[])`

### Campaign
`id, org_id, task_id, reward_pool_minor, platform_fee_minor, funded_minor, objective, status`

### Referral
`id, referrer_id, referee_id, status (pending|verified|reversed), reward_minor (promo credit only), created_at`
> Direct promo incentive only. No multi-level commission, no deposit-linked reward.

### Ticket / Dispute
`id, user_id, type (general|task|payment|withdrawal|kyc), subject, status (open|in_progress|escalated|resolved), thread[], assigned_to, dispute_kind?`

### Notification, AuditLog, FraudCase, CountryConfig(currency, fx_to_usd, withdrawal_fee, is_live), Coupon

---

## 3. Money lifecycle (enforce exactly)
1. Submission `submitted` → task's `pay` appears as **pending** (not withdrawable).
2. Review `approved` → moves pending → **approved/withdrawable**, but only if sponsor escrow for the task is funded.
3. Review `rejected`/`revision` → no money moves; contributor may appeal/resubmit.
4. Withdrawal → deduct withdrawable, apply fee, states: processing → completed OR failed_reversed (refund full amount back to withdrawable).
5. Bill payment → deduct withdrawable; states successful | pending | reversed_refunded (refund on reversal).
6. Plan purchase → **creates zero earnings**. 7-day refund window if no task accepted yet; 5-day grace on failed renewal.

---

## 4. Key API endpoints (REST; adapt to your stack)

**Auth/onboarding:** `POST /auth/register`, `/auth/otp/verify`, `/auth/login`, `/auth/reset`, `POST /kyc`, `POST /kyc/liveness`, `POST /payout-methods`, `POST /assessments/intro`

**Plans:** `GET /plans`, `POST /subscriptions`, `POST /subscriptions/:id/upgrade|downgrade|cancel`, `POST /coupons/validate`

**Marketplace:** `GET /tasks?category&difficulty&pay&deadline&skill&language&country&qualification&review_type` (return eligibility per task for the caller), `GET /tasks/:id`, `POST /tasks/:id/accept`, `POST /qualifications/:id/attempt`

**Workspace:** `PATCH /assignments/:id/autosave`, `POST /assignments/:id/submit`, `POST /assignments/:id/clarification`, `POST /tasks/:id/report`

**Review (reviewer/sponsor):** `GET /review-queue`, `POST /submissions/:id/approve|revision|reject|flag`, `POST /reviews/:id/escalate`, `POST /submissions/:id/appeal`

**Wallet/money:** `GET /wallet`, `GET /transactions`, `POST /withdrawals` (requires PIN + OTP), `GET /withdrawals/:id`, `POST /bills/verify-customer`, `POST /bills/pay`

**Growth:** `GET /ryse-level`, `GET /learning`, `POST /referrals`, `GET /sponsored`, `POST /sponsored/:id/hide|report`

**Business:** `POST /orgs`, `POST /orgs/verify`, `POST /campaigns`, `POST /campaigns/:id/fund`, `GET /campaigns/:id/analytics`, `GET /invoices`

**Support/admin:** `GET/POST /tickets`, `GET /admin/kyc-queue`, `POST /admin/kyc/:id/decision`, `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/release|hold`, `GET /admin/fraud`, `POST /admin/fraud/:id/freeze|clear`, `CRUD /admin/plans|countries|content|roles`, `GET /admin/audit-log`

Every mutation on admin/* and money endpoints → append to `audit_log`.

---

## 5. Non-negotiable copy/rules for any generated text
Allowed: "unlock eligible task categories", "earn from approved submissions", "task availability varies", "payment depends on successful completion and approval".
Forbidden anywhere: "invest and earn", "guaranteed returns", "passive/daily income", "risk-free", "buy a plan and receive fixed earnings".

---

## 6. Design tokens (for whoever builds the frontend later)
Indigo `#171A3A` · dark `#0F1128` · orange `#FF6A3D` (primary) · yellow `#FFC857` (rewards) · green `#16A67A` (approved/success) · info blue `#377DFF` · error `#E5484D` · off-white `#FAFAFC`.
Fonts: **Sora** (headings), **Albert Sans** (body). Radius 10–18px. See `design/Taskryse Design System.dc.html`.
