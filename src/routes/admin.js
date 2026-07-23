const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireRole } = require('../middleware/authorize');
const { audit } = require('../lib/audit');
const { sendJson } = require('../lib/serialize');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();

// Every route here is admin-only, and every mutation appends to the audit log.
router.use(requireRole('ADMIN'));

// GET /admin/kyc-queue — pending KYC records.
router.get('/kyc-queue', asyncHandler(async (req, res) => {
  const queue = await prisma.kycRecord.findMany({
    where: { decision: 'PENDING' },
    include: { user: { select: { id: true, email: true, legalName: true, countryCode: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return sendJson(res, 200, queue);
}));

const kycDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  riskLevel: z.enum(['LOW', 'MED', 'HIGH']).optional(),
});

// POST /admin/kyc/:id/decision — approve/reject KYC (audit-logged).
router.post('/kyc/:id/decision', asyncHandler(async (req, res) => {
  const body = parseBody(kycDecisionSchema, req.body);
  const record = await prisma.$transaction(async (tx) => {
    const kyc = await tx.kycRecord.findUnique({ where: { id: req.params.id } });
    if (!kyc) throw notFound('KYC record not found');
    const updated = await tx.kycRecord.update({
      where: { id: kyc.id },
      data: {
        decision: body.decision,
        riskLevel: body.riskLevel || kyc.riskLevel,
        reviewedBy: req.user.id,
        decidedAt: new Date(),
      },
    });
    await audit(tx, { actor: req.user.id, action: 'kyc.decision', target: kyc.id, meta: { decision: body.decision } });
    return updated;
  });
  return sendJson(res, 200, record);
}));

// GET /admin/withdrawals — held / in-flight payouts.
router.get('/withdrawals', asyncHandler(async (req, res) => {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { status: { in: ['PROCESSING', 'HELD_COMPLIANCE'] } },
    orderBy: { createdAt: 'desc' },
  });
  return sendJson(res, 200, withdrawals);
}));

// POST /admin/withdrawals/:id/release — release a held payout to completion.
router.post('/withdrawals/:id/release', asyncHandler(async (req, res) => {
  const w = await prisma.$transaction(async (tx) => {
    const wd = await tx.withdrawal.findUnique({ where: { id: req.params.id } });
    if (!wd) throw notFound('Withdrawal not found');
    const updated = await tx.withdrawal.update({ where: { id: wd.id }, data: { status: 'COMPLETED' } });
    await audit(tx, { actor: req.user.id, action: 'withdrawal.release', target: wd.id });
    return updated;
  });
  return sendJson(res, 200, w);
}));

// POST /admin/withdrawals/:id/hold — hold a payout for compliance.
router.post('/withdrawals/:id/hold', asyncHandler(async (req, res) => {
  const w = await prisma.$transaction(async (tx) => {
    const wd = await tx.withdrawal.findUnique({ where: { id: req.params.id } });
    if (!wd) throw notFound('Withdrawal not found');
    const updated = await tx.withdrawal.update({ where: { id: wd.id }, data: { status: 'HELD_COMPLIANCE' } });
    await audit(tx, { actor: req.user.id, action: 'withdrawal.hold', target: wd.id });
    return updated;
  });
  return sendJson(res, 200, w);
}));

// GET /admin/fraud — fraud cases.
router.get('/fraud', asyncHandler(async (req, res) => {
  const cases = await prisma.fraudCase.findMany({ orderBy: { createdAt: 'desc' } });
  return sendJson(res, 200, cases);
}));

// POST /admin/fraud/:id/freeze — freeze the associated user's account.
router.post('/fraud/:id/freeze', asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const fc = await tx.fraudCase.findUnique({ where: { id: req.params.id } });
    if (!fc) throw notFound('Fraud case not found');
    const updated = await tx.fraudCase.update({ where: { id: fc.id }, data: { status: 'FROZEN' } });
    if (fc.userId) await tx.user.update({ where: { id: fc.userId }, data: { status: 'FROZEN' } });
    await audit(tx, { actor: req.user.id, action: 'fraud.freeze', target: fc.id, meta: { userId: fc.userId } });
    return updated;
  });
  return sendJson(res, 200, result);
}));

// POST /admin/fraud/:id/clear — clear a case and reactivate the user.
router.post('/fraud/:id/clear', asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const fc = await tx.fraudCase.findUnique({ where: { id: req.params.id } });
    if (!fc) throw notFound('Fraud case not found');
    const updated = await tx.fraudCase.update({ where: { id: fc.id }, data: { status: 'CLEARED', resolvedAt: new Date() } });
    if (fc.userId) await tx.user.update({ where: { id: fc.userId }, data: { status: 'ACTIVE' } });
    await audit(tx, { actor: req.user.id, action: 'fraud.clear', target: fc.id, meta: { userId: fc.userId } });
    return updated;
  });
  return sendJson(res, 200, result);
}));

// ---- CRUD: plans (eligibility config only — never earnings) ----
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { priceMinor: 'asc' } });
  return sendJson(res, 200, plans);
}));

const planSchema = z.object({
  id: z.string().optional(),
  name: z.enum(['STARTER', 'RISER', 'PROFESSIONAL', 'EXPERT']),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().optional(),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).optional(),
  maxActiveApplications: z.number().int().nonnegative(),
  categoryScope: z.array(z.string()),
  qualificationAccess: z.string(),
  supportTier: z.string(),
  sponsoredAccess: z.boolean().optional(),
  isLive: z.boolean().optional(),
});

router.post('/plans', asyncHandler(async (req, res) => {
  const body = parseBody(planSchema, req.body);
  const data = {
    name: body.name,
    priceMinor: body.priceMinor,
    currency: body.currency || 'NGN',
    billingPeriod: body.billingPeriod || 'MONTHLY',
    maxActiveApplications: body.maxActiveApplications,
    categoryScope: body.categoryScope,
    qualificationAccess: body.qualificationAccess,
    supportTier: body.supportTier,
    sponsoredAccess: body.sponsoredAccess || false,
    isLive: body.isLive ?? true,
  };
  const plan = await prisma.$transaction(async (tx) => {
    const saved = body.id
      ? await tx.plan.update({ where: { id: body.id }, data })
      : await tx.plan.create({ data });
    await audit(tx, { actor: req.user.id, action: body.id ? 'plan.update' : 'plan.create', target: saved.id });
    return saved;
  });
  return sendJson(res, 200, plan);
}));

// ---- CRUD: countries ----
router.get('/countries', asyncHandler(async (req, res) => {
  const countries = await prisma.countryConfig.findMany({ orderBy: { code: 'asc' } });
  return sendJson(res, 200, countries);
}));

const countrySchema = z.object({
  code: z.string().length(2),
  currency: z.string(),
  fxToUsd: z.number().positive(),
  withdrawalFeeMinor: z.number().int().nonnegative(),
  isLive: z.boolean().optional(),
});

router.post('/countries', asyncHandler(async (req, res) => {
  const body = parseBody(countrySchema, req.body);
  const country = await prisma.$transaction(async (tx) => {
    const saved = await tx.countryConfig.upsert({
      where: { code: body.code },
      create: { code: body.code, currency: body.currency, fxToUsd: body.fxToUsd, withdrawalFeeMinor: body.withdrawalFeeMinor, isLive: body.isLive || false },
      update: { currency: body.currency, fxToUsd: body.fxToUsd, withdrawalFeeMinor: body.withdrawalFeeMinor, isLive: body.isLive },
    });
    await audit(tx, { actor: req.user.id, action: 'country.upsert', target: saved.code });
    return saved;
  });
  return sendJson(res, 200, country);
}));

// ---- content (task categories / qualifications) ----
router.get('/content', asyncHandler(async (req, res) => {
  const [categories, qualifications, coupons] = await Promise.all([
    prisma.taskCategory.findMany(),
    prisma.qualification.findMany(),
    prisma.coupon.findMany(),
  ]);
  return sendJson(res, 200, { categories, qualifications, coupons });
}));

const contentSchema = z.object({
  kind: z.enum(['category', 'qualification', 'coupon']),
  category: z.object({ family: z.enum(['AI_DATA', 'PROFESSIONAL', 'SPONSORED']), name: z.string(), slug: z.string() }).optional(),
  qualification: z.object({ categoryId: z.string(), title: z.string().optional(), passThreshold: z.number().int().optional() }).optional(),
  coupon: z.object({ code: z.string(), percentOff: z.number().int(), active: z.boolean().optional() }).optional(),
});

router.post('/content', asyncHandler(async (req, res) => {
  const body = parseBody(contentSchema, req.body);
  const result = await prisma.$transaction(async (tx) => {
    let saved;
    if (body.kind === 'category' && body.category) {
      saved = await tx.taskCategory.create({ data: body.category });
    } else if (body.kind === 'qualification' && body.qualification) {
      saved = await tx.qualification.create({ data: { categoryId: body.qualification.categoryId, title: body.qualification.title || 'Qualification', passThreshold: body.qualification.passThreshold ?? 70 } });
    } else if (body.kind === 'coupon' && body.coupon) {
      saved = await tx.coupon.upsert({ where: { code: body.coupon.code.toUpperCase() }, create: { code: body.coupon.code.toUpperCase(), percentOff: body.coupon.percentOff, active: body.coupon.active ?? true }, update: { percentOff: body.coupon.percentOff, active: body.coupon.active ?? true } });
    } else {
      throw badRequest('Missing payload for content kind', 'bad_content');
    }
    await audit(tx, { actor: req.user.id, action: `content.${body.kind}.create`, target: saved.id || saved.code });
    return saved;
  });
  return sendJson(res, 200, result);
}));

// ---- roles (members + scopes) ----
router.get('/roles', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, status: true }, orderBy: { createdAt: 'asc' }, take: 200 });
  const { SCOPES_BY_ROLE } = require('../lib/rbac');
  return sendJson(res, 200, { users, scopesByRole: SCOPES_BY_ROLE });
}));

const roleSchema = z.object({ userId: z.string(), role: z.enum(['CONTRIBUTOR', 'SPONSOR', 'REVIEWER', 'SUPPORT', 'ADMIN']) });

router.post('/roles', asyncHandler(async (req, res) => {
  const body = parseBody(roleSchema, req.body);
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: body.userId }, data: { role: body.role } });
    await audit(tx, { actor: req.user.id, action: 'role.change', target: body.userId, meta: { role: body.role } });
    return updated;
  });
  return sendJson(res, 200, { id: user.id, role: user.role });
}));

// GET /admin/audit-log — immutable log of privileged actions.
router.get('/audit-log', asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return sendJson(res, 200, logs);
}));

module.exports = router;
