// Taskryse — seed data (Prisma). Run after migrate. Mirrors the design demo state.
// Usage: `npx prisma db seed` (configured via package.json "prisma.seed").
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();

const hash = (plain) => bcrypt.hashSync(plain, 10);

async function main() {
  // Countries
  await db.countryConfig.createMany({
    data: [
      { code: 'NG', currency: 'NGN', fxToUsd: 1540, withdrawalFeeMinor: 15000, isLive: true },
      { code: 'GH', currency: 'GHS', fxToUsd: 15.8, withdrawalFeeMinor: 200, isLive: true },
      { code: 'KE', currency: 'KES', fxToUsd: 129, withdrawalFeeMinor: 3000, isLive: true },
      { code: 'ZA', currency: 'ZAR', fxToUsd: 18.4, withdrawalFeeMinor: 600, isLive: true },
      { code: 'EG', currency: 'EGP', fxToUsd: 49.2, withdrawalFeeMinor: 0, isLive: false },
    ],
    skipDuplicates: true,
  });

  // Plans (prices in kobo). Eligibility only — no earnings.
  await db.plan.createMany({
    data: [
      { name: 'STARTER', priceMinor: 250000, maxActiveApplications: 2, categoryScope: ['ai_data'], qualificationAccess: 'intro', supportTier: 'standard', sponsoredAccess: false },
      { name: 'RISER', priceMinor: 600000, maxActiveApplications: 5, categoryScope: ['ai_data', 'audio'], qualificationAccess: 'full', supportTier: 'priority', sponsoredAccess: false },
      { name: 'PROFESSIONAL', priceMinor: 1200000, maxActiveApplications: 10, categoryScope: ['ai_data', 'audio', 'professional'], qualificationAccess: 'full', supportTier: 'priority', sponsoredAccess: false },
      { name: 'EXPERT', priceMinor: 2400000, maxActiveApplications: 9999, categoryScope: ['all'], qualificationAccess: 'full', supportTier: 'dedicated', sponsoredAccess: true },
    ],
    skipDuplicates: true,
  });

  await db.coupon.upsert({ where: { code: 'RYSE10' }, create: { code: 'RYSE10', percentOff: 10, active: true }, update: {} });

  // Categories
  const cats = [
    ['AI_DATA', 'AI response evaluation', 'ai-response-evaluation'],
    ['AI_DATA', 'Data labelling', 'data-labelling'],
    ['AI_DATA', 'Audio transcription', 'audio-transcription'],
    ['PROFESSIONAL', 'Software testing', 'software-testing'],
    ['SPONSORED', 'Brand survey', 'brand-survey'],
  ];
  for (const [family, name, slug] of cats) {
    await db.taskCategory.upsert({ where: { slug }, create: { family, name, slug }, update: {} });
  }

  // A qualification on the software-testing category (a gated professional task uses it).
  const testingCat = await db.taskCategory.findFirst({ where: { slug: 'software-testing' } });
  await db.qualification.create({ data: { categoryId: testingCat.id, title: 'Software testing fundamentals', passThreshold: 70 } });

  // Sponsor org + a live, escrow-funded task.
  const org = await db.organisation.create({ data: { name: 'Meridian AI Labs', verificationStatus: 'verified', escrowBalanceMinor: 214000000n } });
  const cat = await db.taskCategory.findFirst({ where: { slug: 'ai-response-evaluation' } });
  const task = await db.task.create({
    data: {
      sponsorOrgId: org.id, categoryId: cat.id,
      title: 'AI response evaluation — English (Nigeria)',
      description: 'Rate two AI answers against a rubric.',
      instructions: 'Pick the better answer, then rate its accuracy. Read every word — attention checks included.',
      difficulty: 'BEGINNER', payMinor: 180000, deadline: new Date(Date.now() + 5 * 864e5),
      totalSlots: 100, slotsTaken: 58, countries: ['NG'], requiredSkills: ['English'],
      requiresQualification: false, reviewType: 'MANUAL', sponsorVerified: true, status: 'LIVE',
      // Escrow funded so approved submissions can be released.
      escrowFundedMinor: 18000000n, escrowSpentMinor: 0n,
    },
  });
  // Campaign backing the live task.
  await db.campaign.create({ data: { orgId: org.id, taskId: task.id, rewardPoolMinor: 18000000n, platformFeeMinor: 900000n, fundedMinor: 18000000n, objective: 'Evaluate English AI responses', status: 'funded' } });

  // Demo contributor with wallet (mirrors app demo).
  const user = await db.user.create({
    data: {
      email: 'adaeze@example.com', passwordHash: hash('Password123!'), role: 'CONTRIBUTOR',
      legalName: 'Adaeze Nwosu', username: 'adaeze', countryCode: 'NG', emailVerified: true,
      withdrawalPinHash: hash('1234'),
      languages: ['English', 'Yoruba'], skills: ['AI evaluation', 'Transcription'], ryseLevel: 'SKILLED',
    },
  });
  await db.wallet.create({
    data: {
      userId: user.id, currency: 'NGN',
      totalEarnedMinor: 21430000n, approvedMinor: 8640000n, pendingMinor: 460000n,
      withdrawableMinor: 8640000n, promoCreditMinor: 50000n,
    },
  });
  // An active subscription so the demo contributor is eligible for ai_data tasks.
  const starter = await db.plan.findFirst({ where: { name: 'STARTER' } });
  await db.subscription.create({ data: { userId: user.id, planId: starter.id, status: 'ACTIVE', renewsAt: new Date(Date.now() + 30 * 864e5), hasAcceptedTask: false, refundableUntil: new Date(Date.now() + 7 * 864e5) } });

  // Staff accounts for reviewer/sponsor/admin flows.
  const reviewer = await db.user.create({ data: { email: 'reviewer@taskryse.com', passwordHash: hash('Password123!'), role: 'REVIEWER', legalName: 'Rita Reviewer', username: 'rita', emailVerified: true } });
  const sponsorUser = await db.user.create({ data: { email: 'sponsor@meridian.ai', passwordHash: hash('Password123!'), role: 'SPONSOR', legalName: 'Sam Sponsor', username: 'sam', emailVerified: true } });
  await db.orgMember.create({ data: { orgId: org.id, userId: sponsorUser.id, role: 'owner', scopes: ['*'] } });
  await db.user.create({ data: { email: 'admin@taskryse.com', passwordHash: hash('Password123!'), role: 'ADMIN', legalName: 'Ada Admin', username: 'admin', emailVerified: true } });

  console.log('Seed complete.');
  console.log('Demo logins (password: Password123!):');
  console.log('  contributor  adaeze@example.com   (withdrawal PIN 1234)');
  console.log('  reviewer     reviewer@taskryse.com');
  console.log('  sponsor      sponsor@meridian.ai');
  console.log('  admin        admin@taskryse.com');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
