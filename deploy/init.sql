-- Taskryse — one-shot database setup for Neon / any Postgres.
-- Paste this whole file into the Neon SQL Editor and Run.
-- Creates all tables + enums, then loads demo data.
-- Demo logins (password: Password123!): adaeze@example.com (PIN 1234),
--   reviewer@taskryse.com, sponsor@meridian.ai, admin@taskryse.com

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONTRIBUTOR', 'SPONSOR', 'REVIEWER', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'FROZEN', 'DELETED');

-- CreateEnum
CREATE TYPE "KycDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LivenessStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MED', 'HIGH');

-- CreateEnum
CREATE TYPE "PlanName" AS ENUM ('STARTER', 'RISER', 'PROFESSIONAL', 'EXPERT');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'GRACE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CategoryFamily" AS ENUM ('AI_DATA', 'PROFESSIONAL', 'SPONSORED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('MANUAL', 'AUTO', 'TEAM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACCEPTED', 'IN_PROGRESS', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'DISPUTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REVISION', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'UPHELD', 'OVERTURNED');

-- CreateEnum
CREATE TYPE "RyseLevel" AS ENUM ('NEW', 'ACTIVE', 'SKILLED', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('TASK_PAYMENT', 'WITHDRAWAL', 'BILL', 'SUBSCRIPTION', 'REFUND', 'PROMO', 'FEE');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED_REVERSED', 'HELD_COMPLIANCE');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK', 'MOBILE_MONEY', 'PAYPAL', 'STABLECOIN');

-- CreateEnum
CREATE TYPE "BillService" AS ENUM ('AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET', 'EDUCATION');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('SUCCESSFUL', 'PENDING', 'REVERSED_REFUNDED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('GENERAL', 'TASK', 'PAYMENT', 'WITHDRAWAL', 'KYC');

-- CreateEnum
CREATE TYPE "FraudStatus" AS ENUM ('OPEN', 'FROZEN', 'CLEARED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "withdrawalPinHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CONTRIBUTOR',
    "legalName" TEXT,
    "username" TEXT,
    "photoUrl" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'NG',
    "languages" TEXT[],
    "skills" TEXT[],
    "availability" TEXT,
    "bio" TEXT,
    "ryseLevel" "RyseLevel" NOT NULL DEFAULT 'NEW',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idType" TEXT NOT NULL,
    "idDocumentUrl" TEXT,
    "liveness" "LivenessStatus" NOT NULL DEFAULT 'PENDING',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "decision" "KycDecision" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutMethodRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "label" TEXT,
    "destinationRef" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutMethodRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" "PlanName" NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "maxActiveApplications" INTEGER NOT NULL,
    "categoryScope" TEXT[],
    "qualificationAccess" TEXT NOT NULL,
    "supportTier" TEXT NOT NULL,
    "sponsoredAccess" BOOLEAN NOT NULL DEFAULT false,
    "isLive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewsAt" TIMESTAMP(3),
    "graceUntil" TIMESTAMP(3),
    "couponCode" TEXT,
    "hasAcceptedTask" BOOLEAN NOT NULL DEFAULT false,
    "refundableUntil" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" TEXT NOT NULL,
    "family" "CategoryFamily" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "escrowBalanceMinor" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "scopes" TEXT[],

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "sponsorOrgId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "payMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "deadline" TIMESTAMP(3),
    "totalSlots" INTEGER NOT NULL,
    "slotsTaken" INTEGER NOT NULL DEFAULT 0,
    "minRyseLevel" "RyseLevel" NOT NULL DEFAULT 'NEW',
    "countries" TEXT[],
    "requiredSkills" TEXT[],
    "requiresQualification" BOOLEAN NOT NULL DEFAULT false,
    "reviewType" "ReviewType" NOT NULL DEFAULT 'MANUAL',
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsorVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "escrowFundedMinor" BIGINT NOT NULL DEFAULT 0,
    "escrowSpentMinor" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACCEPTED',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "autosavePayload" JSONB,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "autoChecks" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rubricScores" JSONB NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "secondReviewerId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Qualification',
    "passThreshold" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retakeAfter" TIMESTAMP(3),

    CONSTRAINT "QualificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "totalEarnedMinor" BIGINT NOT NULL DEFAULT 0,
    "approvedMinor" BIGINT NOT NULL DEFAULT 0,
    "pendingMinor" BIGINT NOT NULL DEFAULT 0,
    "withdrawableMinor" BIGINT NOT NULL DEFAULT 0,
    "promoCreditMinor" BIGINT NOT NULL DEFAULT 0,
    "refundMinor" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "relatedTaskId" TEXT,
    "grossMinor" BIGINT NOT NULL,
    "feeMinor" BIGINT NOT NULL DEFAULT 0,
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "netMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "feeMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "payoutMethod" "PayoutMethod" NOT NULL,
    "destinationRef" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PROCESSING',
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "pinVerified" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" "BillService" NOT NULL,
    "provider" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'SUCCESSFUL',
    "tokenRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "rewardPoolMinor" BIGINT NOT NULL,
    "platformFeeMinor" BIGINT NOT NULL,
    "fundedMinor" BIGINT NOT NULL DEFAULT 0,
    "objective" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardMinor" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "thread" JSONB NOT NULL,
    "assignedTo" TEXT,
    "disputeKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryConfig" (
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "fxToUsd" DOUBLE PRECISION NOT NULL,
    "withdrawalFeeMinor" INTEGER NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CountryConfig_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "FraudCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "submissionId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "FraudStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FraudCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "KycRecord_userId_key" ON "KycRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_slug_key" ON "TaskCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_orgId_userId_key" ON "OrgMember"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_assignmentId_key" ON "Submission"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_submissionId_key" ON "Review"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_submissionId_key" ON "Appeal"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_reference_key" ON "WalletEntry"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_reference_key" ON "Withdrawal"("reference");

-- AddForeignKey
ALTER TABLE "KycRecord" ADD CONSTRAINT "KycRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutMethodRecord" ADD CONSTRAINT "PayoutMethodRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sponsorOrgId_fkey" FOREIGN KEY ("sponsorOrgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationAttempt" ADD CONSTRAINT "QualificationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationAttempt" ADD CONSTRAINT "QualificationAttempt_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudCase" ADD CONSTRAINT "FraudCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================ SEED DATA ============================
-- Seed data (idempotent). Passwords: Password123!  | withdrawal PIN: 1234
BEGIN;

INSERT INTO "CountryConfig" ("code","currency","fxToUsd","withdrawalFeeMinor","isLive") VALUES
('NG','NGN',1540,15000,true),
('GH','GHS',15.8,200,true),
('KE','KES',129,3000,true),
('ZA','ZAR',18.4,600,true),
('EG','EGP',49.2,0,false)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Plan" ("id","name","priceMinor","currency","billingPeriod","maxActiveApplications","categoryScope","qualificationAccess","supportTier","sponsoredAccess","isLive") VALUES
('plan_starter','STARTER'::"PlanName",250000,'NGN','MONTHLY'::"BillingPeriod",2,ARRAY['ai_data']::text[],'intro','standard',false,true),
('plan_riser','RISER'::"PlanName",600000,'NGN','MONTHLY'::"BillingPeriod",5,ARRAY['ai_data','audio']::text[],'full','priority',false,true),
('plan_professional','PROFESSIONAL'::"PlanName",1200000,'NGN','MONTHLY'::"BillingPeriod",10,ARRAY['ai_data','audio','professional']::text[],'full','priority',false,true),
('plan_expert','EXPERT'::"PlanName",2400000,'NGN','MONTHLY'::"BillingPeriod",9999,ARRAY['all']::text[],'full','dedicated',true,true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Coupon" ("code","percentOff","active") VALUES ('RYSE10',10,true) ON CONFLICT ("code") DO NOTHING;

INSERT INTO "TaskCategory" ("id","family","name","slug") VALUES
('cat_ai_eval','AI_DATA'::"CategoryFamily",'AI response evaluation','ai-response-evaluation'),
('cat_data_label','AI_DATA'::"CategoryFamily",'Data labelling','data-labelling'),
('cat_audio','AI_DATA'::"CategoryFamily",'Audio transcription','audio-transcription'),
('cat_software_test','PROFESSIONAL'::"CategoryFamily",'Software testing','software-testing'),
('cat_brand_survey','SPONSORED'::"CategoryFamily",'Brand survey','brand-survey')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Qualification" ("id","categoryId","title","passThreshold") VALUES ('qual_sw_test','cat_software_test','Software testing fundamentals',70) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Organisation" ("id","name","verificationStatus","escrowBalanceMinor") VALUES ('org_meridian','Meridian AI Labs','verified',214000000) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Task" ("id","sponsorOrgId","categoryId","title","description","instructions","difficulty","payMinor","currency","deadline","totalSlots","slotsTaken","minRyseLevel","countries","requiredSkills","requiresQualification","reviewType","isSponsored","sponsorVerified","status","escrowFundedMinor","escrowSpentMinor") VALUES
('task_ai_eval','org_meridian','cat_ai_eval','AI response evaluation — English (Nigeria)','Rate two AI answers against a rubric.','Pick the better answer, then rate its accuracy. Read every word — attention checks included.','BEGINNER'::"Difficulty",180000,'NGN',NOW()+INTERVAL '5 days',100,58,'NEW'::"RyseLevel",ARRAY['NG']::text[],ARRAY['English']::text[],false,'MANUAL'::"ReviewType",false,true,'LIVE'::"TaskStatus",18000000,0)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Campaign" ("id","orgId","taskId","rewardPoolMinor","platformFeeMinor","fundedMinor","objective","status") VALUES ('camp_1','org_meridian','task_ai_eval',18000000,900000,18000000,'Evaluate English AI responses','funded') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "User" ("id","email","passwordHash","withdrawalPinHash","role","legalName","username","countryCode","languages","skills","ryseLevel","emailVerified") VALUES
('user_adaeze','adaeze@example.com','$2a$10$M2Oul6ZHYTEIkXmzVHw9RevThMLdVqJtQCyy.SdlcncB.cGbxroai','$2a$10$fywgxSxL2UP.2flcgHkrY.0muo1K3nMBYD2HfH2afPaSZjzYtP5BW','CONTRIBUTOR'::"Role",'Adaeze Nwosu','adaeze','NG',ARRAY['English','Yoruba']::text[],ARRAY['AI evaluation','Transcription']::text[],'SKILLED'::"RyseLevel",true),
('user_reviewer','reviewer@taskryse.com','$2a$10$M2Oul6ZHYTEIkXmzVHw9RevThMLdVqJtQCyy.SdlcncB.cGbxroai',NULL,'REVIEWER'::"Role",'Rita Reviewer','rita','NG',ARRAY[]::text[],ARRAY[]::text[],'NEW'::"RyseLevel",true),
('user_sponsor','sponsor@meridian.ai','$2a$10$M2Oul6ZHYTEIkXmzVHw9RevThMLdVqJtQCyy.SdlcncB.cGbxroai',NULL,'SPONSOR'::"Role",'Sam Sponsor','sam','NG',ARRAY[]::text[],ARRAY[]::text[],'NEW'::"RyseLevel",true),
('user_admin','admin@taskryse.com','$2a$10$M2Oul6ZHYTEIkXmzVHw9RevThMLdVqJtQCyy.SdlcncB.cGbxroai',NULL,'ADMIN'::"Role",'Ada Admin','admin','NG',ARRAY[]::text[],ARRAY[]::text[],'NEW'::"RyseLevel",true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Wallet" ("id","userId","currency","totalEarnedMinor","approvedMinor","pendingMinor","withdrawableMinor","promoCreditMinor") VALUES ('wallet_adaeze','user_adaeze','NGN',21430000,8640000,460000,8640000,50000) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Subscription" ("id","userId","planId","status","renewsAt","refundableUntil","hasAcceptedTask") VALUES ('sub_adaeze','user_adaeze','plan_starter','ACTIVE'::"SubStatus",NOW()+INTERVAL '30 days',NOW()+INTERVAL '7 days',false) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "OrgMember" ("id","orgId","userId","role","scopes") VALUES ('om_sponsor','org_meridian','user_sponsor','owner',ARRAY['*']::text[]) ON CONFLICT ("id") DO NOTHING;

COMMIT;
