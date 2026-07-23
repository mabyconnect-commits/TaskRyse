const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireScope } = require('../middleware/authorize');
const {
  ensureWallet, recordEntry, debitWithdrawable, creditWithdrawable,
} = require('../lib/wallet');
const { verifyPassword } = require('../lib/auth');
const { makeReference } = require('../lib/reference');
const { audit } = require('../lib/audit');
const { sendJson } = require('../lib/serialize');
const { badRequest, paymentRequired, forbidden, notFound } = require('../lib/errors');

const router = express.Router();

// GET /wallet — balances. promoCreditMinor is reported but is NEVER withdrawable.
router.get('/wallet', requireScope('wallet:read'), asyncHandler(async (req, res) => {
  const wallet = await ensureWallet(prisma, req.user.id, 'NGN');
  return sendJson(res, 200, {
    totalEarnedMinor: wallet.totalEarnedMinor,
    approvedMinor: wallet.approvedMinor,
    pendingMinor: wallet.pendingMinor,
    withdrawableMinor: wallet.withdrawableMinor,
    promoCreditMinor: wallet.promoCreditMinor,
    refundMinor: wallet.refundMinor,
    currency: wallet.currency,
  });
}));

// GET /transactions — ledger entries.
router.get('/transactions', requireScope('wallet:read'), asyncHandler(async (req, res) => {
  const wallet = await ensureWallet(prisma, req.user.id, 'NGN');
  const entries = await prisma.walletEntry.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return sendJson(res, 200, entries);
}));

const withdrawalSchema = z.object({
  amountMinor: z.number().int().positive(),
  payoutMethod: z.enum(['BANK', 'MOBILE_MONEY', 'PAYPAL', 'STABLECOIN']),
  destinationRef: z.string(),
  pin: z.string(),
  otp: z.string(),
  // Simulate the downstream payout result for this reference build.
  simulateOutcome: z.enum(['completed', 'failed_reversed']).optional(),
});

// POST /withdrawals — Money lifecycle #4. Requires PIN + OTP.
// Deducts withdrawable, applies fee, states processing -> completed | failed_reversed.
router.post('/withdrawals', requireScope('wallet:withdraw'), asyncHandler(async (req, res) => {
  const body = parseBody(withdrawalSchema, req.body);

  // PIN verification (set via /payout-methods).
  if (!req.user.withdrawalPinHash) throw forbidden('Set a withdrawal PIN first', 'pin_not_set');
  const pinOk = await verifyPassword(body.pin, req.user.withdrawalPinHash);
  if (!pinOk) throw forbidden('Invalid PIN', 'pin_failed');
  // OTP verification (demo: any 6-digit numeric OTP passes; real build would check a sent code).
  if (!/^\d{6}$/.test(body.otp)) throw forbidden('Invalid OTP', 'otp_failed');

  const country = await prisma.countryConfig.findUnique({ where: { code: req.user.countryCode } });
  const feeMinor = BigInt(country ? country.withdrawalFeeMinor : 0);
  const amount = BigInt(body.amountMinor);

  const out = await prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(tx, req.user.id, country ? country.currency : 'NGN');
    // Only earned/withdrawable funds — never promo credit.
    if (BigInt(wallet.withdrawableMinor) < amount + feeMinor) {
      throw paymentRequired('Insufficient withdrawable balance', 'insufficient_withdrawable');
    }

    await debitWithdrawable(tx, wallet, amount + feeMinor);

    const reference = makeReference('WD');
    const withdrawal = await tx.withdrawal.create({
      data: {
        userId: req.user.id,
        amountMinor: amount,
        feeMinor,
        currency: wallet.currency,
        payoutMethod: body.payoutMethod,
        destinationRef: body.destinationRef,
        status: 'PROCESSING',
        otpVerified: true,
        pinVerified: true,
        reference,
      },
    });
    await recordEntry(tx, wallet.id, {
      type: 'WITHDRAWAL',
      grossMinor: amount + feeMinor,
      feeMinor,
      netMinor: amount,
      currency: wallet.currency,
      status: 'processing',
      reference,
    });

    // Resolve the payout. Default success; failure reverses the full amount + fee.
    const outcome = body.simulateOutcome || 'completed';
    let finalStatus = 'PROCESSING';
    if (outcome === 'completed') {
      finalStatus = 'COMPLETED';
      await tx.withdrawal.update({ where: { id: withdrawal.id }, data: { status: 'COMPLETED' } });
    } else if (outcome === 'failed_reversed') {
      finalStatus = 'FAILED_REVERSED';
      await tx.withdrawal.update({ where: { id: withdrawal.id }, data: { status: 'FAILED_REVERSED' } });
      // Refund full amount + fee back to withdrawable.
      await creditWithdrawable(tx, wallet, amount + feeMinor);
      await recordEntry(tx, wallet.id, {
        type: 'REFUND', grossMinor: amount + feeMinor, netMinor: amount + feeMinor,
        currency: wallet.currency, status: 'reversed', reference: makeReference('RVS'),
      });
    }

    await audit(tx, {
      actor: req.user.id, action: 'withdrawal.create', target: withdrawal.id,
      meta: { amountMinor: body.amountMinor, feeMinor: Number(feeMinor), status: finalStatus },
    });
    return { withdrawal, finalStatus };
  });

  return sendJson(res, 201, {
    id: out.withdrawal.id,
    reference: out.withdrawal.reference,
    amountMinor: out.withdrawal.amountMinor,
    feeMinor: out.withdrawal.feeMinor,
    status: out.finalStatus,
  });
}));

// GET /withdrawals/:id — status.
router.get('/withdrawals/:id', requireScope('wallet:read'), asyncHandler(async (req, res) => {
  const w = await prisma.withdrawal.findUnique({ where: { id: req.params.id } });
  if (!w) throw notFound('Withdrawal not found');
  if (w.userId !== req.user.id && req.user.role !== 'ADMIN') throw forbidden('Not your withdrawal');
  return sendJson(res, 200, w);
}));

const verifyCustomerSchema = z.object({
  service: z.enum(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET', 'EDUCATION']),
  provider: z.string(),
  customerRef: z.string(),
});

// POST /bills/verify-customer — verify meter/phone/smartcard (demo lookup).
router.post('/bills/verify-customer', requireScope('bills:pay'), asyncHandler(async (req, res) => {
  const body = parseBody(verifyCustomerSchema, req.body);
  // Reference build: echo a deterministic "resolved" customer name.
  return sendJson(res, 200, {
    service: body.service,
    provider: body.provider,
    customerRef: body.customerRef,
    customerName: `Verified Customer ${body.customerRef.slice(-4)}`,
    valid: true,
  });
}));

const billPaySchema = z.object({
  service: z.enum(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET', 'EDUCATION']),
  provider: z.string(),
  customerRef: z.string(),
  amountMinor: z.number().int().positive(),
  simulateOutcome: z.enum(['successful', 'pending', 'reversed_refunded']).optional(),
});

// POST /bills/pay — Money lifecycle #5. Pay from withdrawable balance.
router.post('/bills/pay', requireScope('bills:pay'), asyncHandler(async (req, res) => {
  const body = parseBody(billPaySchema, req.body);
  const amount = BigInt(body.amountMinor);

  const out = await prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(tx, req.user.id, 'NGN');
    if (BigInt(wallet.withdrawableMinor) < amount) {
      throw paymentRequired('Insufficient withdrawable balance', 'insufficient_withdrawable');
    }
    await debitWithdrawable(tx, wallet, amount);

    const reference = makeReference('BILL');
    const outcome = body.simulateOutcome || 'successful';
    const statusMap = { successful: 'SUCCESSFUL', pending: 'PENDING', reversed_refunded: 'REVERSED_REFUNDED' };
    const bill = await tx.billPayment.create({
      data: {
        userId: req.user.id,
        service: body.service,
        provider: body.provider,
        customerRef: body.customerRef,
        amountMinor: amount,
        status: statusMap[outcome],
        tokenRef: body.service === 'ELECTRICITY' ? makeReference('TOKEN') : null,
      },
    });
    await recordEntry(tx, wallet.id, {
      type: 'BILL', grossMinor: amount, netMinor: amount, currency: wallet.currency,
      status: outcome, reference,
    });

    // Reversal refunds the amount back to withdrawable.
    if (outcome === 'reversed_refunded') {
      await creditWithdrawable(tx, wallet, amount);
      await recordEntry(tx, wallet.id, {
        type: 'REFUND', grossMinor: amount, netMinor: amount, currency: wallet.currency,
        status: 'reversed', reference: makeReference('RVS'),
      });
    }

    await audit(tx, { actor: req.user.id, action: 'bill.pay', target: bill.id, meta: { amountMinor: body.amountMinor, status: statusMap[outcome] } });
    return bill;
  });

  return sendJson(res, 201, out);
}));

module.exports = router;
