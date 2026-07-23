const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { hashPassword } = require('../lib/auth');
const { requireScope } = require('../middleware/authorize');
const { sendJson } = require('../lib/serialize');
const { badRequest } = require('../lib/errors');

const router = express.Router();

const kycSchema = z.object({
  idType: z.string(),
  idDocumentUrl: z.string().optional(),
});

// POST /kyc — submit KYC docs (goes into admin queue; decision is admin-only).
router.post('/kyc', requireScope('kyc:submit'), asyncHandler(async (req, res) => {
  const body = parseBody(kycSchema, req.body);
  const record = await prisma.kycRecord.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, idType: body.idType, idDocumentUrl: body.idDocumentUrl },
    update: { idType: body.idType, idDocumentUrl: body.idDocumentUrl, decision: 'PENDING' },
  });
  return sendJson(res, 201, record);
}));

const livenessSchema = z.object({ selfieUrl: z.string().optional() });

// POST /kyc/liveness — liveness/selfie check (auto-passes in this reference build).
router.post('/kyc/liveness', requireScope('kyc:submit'), asyncHandler(async (req, res) => {
  parseBody(livenessSchema, req.body);
  const existing = await prisma.kycRecord.findUnique({ where: { userId: req.user.id } });
  if (!existing) throw badRequest('Submit KYC documents first', 'kyc_missing');
  const record = await prisma.kycRecord.update({
    where: { userId: req.user.id },
    data: { liveness: 'PASSED' },
  });
  return sendJson(res, 200, { liveness: record.liveness });
}));

const payoutSchema = z.object({
  method: z.enum(['BANK', 'MOBILE_MONEY', 'PAYPAL', 'STABLECOIN']),
  destinationRef: z.string(),
  label: z.string().optional(),
  isDefault: z.boolean().optional(),
  pin: z.string().min(4).optional(),
});

// POST /payout-methods — add a payout destination. May set the withdrawal PIN.
router.post('/payout-methods', requireScope('payout:manage'), asyncHandler(async (req, res) => {
  const body = parseBody(payoutSchema, req.body);
  if (body.isDefault) {
    await prisma.payoutMethodRecord.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  }
  const record = await prisma.payoutMethodRecord.create({
    data: {
      userId: req.user.id,
      method: body.method,
      destinationRef: body.destinationRef,
      label: body.label,
      isDefault: body.isDefault || false,
    },
  });
  if (body.pin) {
    await prisma.user.update({ where: { id: req.user.id }, data: { withdrawalPinHash: await hashPassword(body.pin) } });
  }
  return sendJson(res, 201, record);
}));

// A tiny intro assessment. Score maps to a recommended plan tier (eligibility framing only).
const assessmentSchema = z.object({
  answers: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  score: z.number().min(0).max(100).optional(),
});

// POST /assessments/intro — returns a recommended plan (never earnings language).
router.post('/assessments/intro', asyncHandler(async (req, res) => {
  const body = parseBody(assessmentSchema, req.body);
  const score = body.score ?? (body.answers ? Math.min(100, body.answers.length * 20) : 0);
  let recommended = 'STARTER';
  if (score >= 80) recommended = 'PROFESSIONAL';
  else if (score >= 55) recommended = 'RISER';
  const plan = await prisma.plan.findFirst({ where: { name: recommended } });
  return sendJson(res, 200, {
    score,
    recommendedPlan: recommended,
    plan,
    note: 'A plan unlocks eligible task categories. Task availability varies; payment depends on successful completion and approval.',
  });
}));

module.exports = router;
