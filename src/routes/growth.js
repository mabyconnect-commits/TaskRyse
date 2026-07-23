const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireScope } = require('../middleware/authorize');
const { ryseProgress } = require('../lib/ryse');
const { ensureWallet, addPromoCredit } = require('../lib/wallet');
const { makeReference } = require('../lib/reference');
const { sendJson } = require('../lib/serialize');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();

// GET /ryse-level — derived level + progress. Never from spend/referrals.
router.get('/ryse-level', asyncHandler(async (req, res) => {
  const progress = await ryseProgress(req.user.id);
  return sendJson(res, 200, progress);
}));

// GET /learning — courses + the caller's qualification history.
router.get('/learning', requireScope('learning:read'), asyncHandler(async (req, res) => {
  const qualifications = await prisma.qualification.findMany({ include: { category: true } });
  const attempts = await prisma.qualificationAttempt.findMany({
    where: { userId: req.user.id },
    include: { qualification: { include: { category: true } } },
    orderBy: { takenAt: 'desc' },
  });
  const courses = qualifications.map((q) => ({
    qualificationId: q.id,
    title: q.title,
    category: q.category ? q.category.name : null,
    passThreshold: q.passThreshold,
  }));
  return sendJson(res, 200, { courses, history: attempts });
}));

const referralSchema = z.object({ refereeEmail: z.string().email().optional(), refereeId: z.string().optional() });

// POST /referrals — create a referral. Reward is PROMO CREDIT ONLY (non-withdrawable).
// No multi-level commission, no deposit-linked reward.
router.post('/referrals', requireScope('referrals:create'), asyncHandler(async (req, res) => {
  const body = parseBody(referralSchema, req.body);
  let refereeId = body.refereeId || null;
  if (!refereeId && body.refereeEmail) {
    const referee = await prisma.user.findUnique({ where: { email: body.refereeEmail } });
    refereeId = referee ? referee.id : null;
  }

  // Fixed, direct promo incentive.
  const rewardMinor = 50000n; // ₦500 promo credit
  const referral = await prisma.referral.create({
    data: { referrerId: req.user.id, refereeId, status: 'PENDING', rewardMinor },
  });

  return sendJson(res, 201, {
    referral,
    note: 'Referral reward is promo credit only (non-withdrawable). Credited when the referee is verified.',
  });
}));

// GET /sponsored — labelled sponsored campaigns for the caller.
router.get('/sponsored', asyncHandler(async (req, res) => {
  const campaigns = await prisma.campaign.findMany({
    where: { task: { isSponsored: true, status: 'LIVE' } },
    include: { task: { include: { category: true } }, org: { select: { name: true, verificationStatus: true } } },
  });
  const items = campaigns.map((c) => ({
    campaignId: c.id,
    label: 'Sponsored',
    objective: c.objective,
    org: c.org,
    task: c.task ? { id: c.task.id, title: c.task.title, category: c.task.category?.name } : null,
  }));
  return sendJson(res, 200, items);
}));

// POST /sponsored/:id/hide — hide a sponsored campaign for the caller.
router.post('/sponsored/:id/hide', asyncHandler(async (req, res) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) throw notFound('Campaign not found');
  await prisma.notification.create({
    data: { userId: req.user.id, kind: 'sponsored_hidden', title: 'Sponsored item hidden', body: campaign.id },
  });
  return sendJson(res, 200, { hidden: true });
}));

const reportSponsoredSchema = z.object({ reason: z.string() });

// POST /sponsored/:id/report — report a sponsored campaign.
router.post('/sponsored/:id/report', asyncHandler(async (req, res) => {
  const body = parseBody(reportSponsoredSchema, req.body);
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) throw notFound('Campaign not found');
  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user.id, type: 'GENERAL', subject: `Report sponsored: ${campaign.id}`,
      disputeKind: 'sponsored_report', thread: [{ from: req.user.id, at: new Date().toISOString(), message: body.reason }],
    },
  });
  return sendJson(res, 201, { ticketId: ticket.id });
}));

module.exports = router;
