const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { authenticate } = require('../middleware/authenticate');
const { requireScope } = require('../middleware/authorize');
const { ensureWallet, recordSubscription } = require('../lib/wallet');
const { makeReference } = require('../lib/reference');
const { sendJson } = require('../lib/serialize');
const { badRequest, notFound, forbidden } = require('../lib/errors');

const router = express.Router();

// GET /plans — public plan catalogue (eligibility config only, never earnings).
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await prisma.plan.findMany({ where: { isLive: true }, orderBy: { priceMinor: 'asc' } });
  return sendJson(res, 200, plans);
}));

// GET /subscriptions — the caller's current subscription (with plan), or null.
router.get('/subscriptions', authenticate, requireScope('subscription:manage'), asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user.id },
    include: { plan: true },
  });
  return sendJson(res, 200, sub || null);
}));

// POST /coupons/validate — check a coupon code.
const couponSchema = z.object({ code: z.string() });
router.post('/coupons/validate', asyncHandler(async (req, res) => {
  const body = parseBody(couponSchema, req.body);
  const coupon = await prisma.coupon.findUnique({ where: { code: body.code.toUpperCase() } });
  const valid = Boolean(coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > new Date()));
  return sendJson(res, 200, {
    valid,
    percentOff: valid ? coupon.percentOff : 0,
    code: coupon ? coupon.code : body.code,
  });
}));

// Apply an optional coupon to a price. Returns { priceMinor, discountMinor }.
async function applyCoupon(code, priceMinor) {
  if (!code) return { priceMinor, discountMinor: 0, couponCode: null };
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt <= new Date())) {
    return { priceMinor, discountMinor: 0, couponCode: null };
  }
  const discountMinor = Math.floor((priceMinor * coupon.percentOff) / 100);
  return { priceMinor: priceMinor - discountMinor, discountMinor, couponCode: coupon.code };
}

const subscribeSchema = z.object({
  planId: z.string(),
  couponCode: z.string().optional(),
});

// POST /subscriptions — subscribe (checkout). MUST NOT create any earnings.
router.post('/subscriptions', authenticate, requireScope('subscription:manage'), asyncHandler(async (req, res) => {
  const body = parseBody(subscribeSchema, req.body);
  const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.isLive) throw notFound('Plan not found');

  const existing = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
  // Already on this exact plan — nothing to charge, report it plainly.
  if (existing && existing.status === 'ACTIVE' && existing.planId === plan.id) {
    throw badRequest('You are already on this plan.', 'already_on_plan');
  }
  // Active on a different plan → treat this as a switch (upgrade/downgrade).
  const isSwitch = Boolean(existing && existing.status === 'ACTIVE');

  const { priceMinor, discountMinor, couponCode } = await applyCoupon(body.couponCode, plan.priceMinor);
  const now = new Date();
  const renewsAt = new Date(now.getTime() + (plan.billingPeriod === 'ANNUAL' ? 365 : 30) * 864e5);
  const refundableUntil = new Date(now.getTime() + 7 * 864e5); // 7-day refund window

  const result = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        planId: plan.id,
        status: 'ACTIVE',
        renewsAt,
        couponCode,
        hasAcceptedTask: false,
        refundableUntil,
      },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        startedAt: now,
        renewsAt,
        couponCode,
        graceUntil: null,
        hasAcceptedTask: false,
        refundableUntil,
      },
    });

    // Ledger: record the plan SPEND only. This creates ZERO earnings.
    // On a plan switch we don't re-charge the full price in this demo.
    const wallet = await ensureWallet(tx, req.user.id, plan.currency);
    if (!isSwitch) await recordSubscription(tx, wallet, priceMinor, makeReference('SUB'));

    return sub;
  });

  return sendJson(res, isSwitch ? 200 : 201, {
    subscription: result,
    charged: { minor: isSwitch ? 0 : priceMinor, currency: plan.currency },
    discountMinor,
    switched: isSwitch,
    note: 'Plan grants eligible task categories only. It creates no earnings, tasks, or returns.',
  });
}));

const changeSchema = z.object({ planId: z.string() });

// POST /subscriptions/:id/upgrade — switch to a higher plan.
router.post('/subscriptions/:id/upgrade', authenticate, requireScope('subscription:manage'), asyncHandler(async (req, res) => {
  return changePlan(req, res, 'upgrade');
}));

// POST /subscriptions/:id/downgrade — switch to a lower plan.
router.post('/subscriptions/:id/downgrade', authenticate, requireScope('subscription:manage'), asyncHandler(async (req, res) => {
  return changePlan(req, res, 'downgrade');
}));

async function changePlan(req, res, kind) {
  const body = parseBody(changeSchema, req.body);
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!sub) throw notFound('Subscription not found');
  if (sub.userId !== req.user.id) throw forbidden('Not your subscription');
  const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
  if (!plan || !plan.isLive) throw notFound('Plan not found');

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { planId: plan.id, status: 'ACTIVE' },
  });
  return sendJson(res, 200, { subscription: updated, kind });
}

// POST /subscriptions/:id/cancel — cancel; refund only within the 7-day window
// and only if no task has been accepted under the plan.
router.post('/subscriptions/:id/cancel', authenticate, requireScope('subscription:manage'), asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!sub) throw notFound('Subscription not found');
  if (sub.userId !== req.user.id) throw forbidden('Not your subscription');

  const withinWindow = sub.refundableUntil && sub.refundableUntil > new Date();
  const refundEligible = Boolean(withinWindow && !sub.hasAcceptedTask);

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'CANCELLED' },
  });
  return sendJson(res, 200, {
    subscription: updated,
    refundEligible,
    note: refundEligible
      ? 'Within 7-day window and no task accepted — eligible for plan refund.'
      : 'Not eligible for plan refund (window elapsed or a task was already accepted).',
  });
}));

module.exports = router;
