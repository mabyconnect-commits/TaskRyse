// Wallet / double-entry ledger service — the enforcement point for the money rule.
//
// Balance fields (all minor units):
//   totalEarnedMinor  lifetime approved earnings (only ever increments on approval)
//   pendingMinor      earnings from submitted-but-not-yet-approved work
//   approvedMinor     approved funds currently available (mirrors withdrawable)
//   withdrawableMinor spendable balance
//   promoCreditMinor  SEPARATE, NON-WITHDRAWABLE promotional balance
//   refundMinor       cumulative refunds credited (informational)
//
// Invariants enforced here:
//   * A plan purchase NEVER creates earnings (recordSubscription touches no earning field).
//   * Promo credit NEVER lands in withdrawableMinor.
//   * Earnings become withdrawable ONLY when a submission is approved AND the task's
//     escrow is funded (checked by the caller via reserveEscrow before approveEarning).
const { makeReference } = require('./reference');

async function ensureWallet(tx, userId, currency = 'NGN') {
  const existing = await tx.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.wallet.create({ data: { userId, currency } });
}

// Create a ledger entry. Every money movement writes one.
async function recordEntry(tx, walletId, { type, grossMinor, feeMinor = 0n, netMinor, currency = 'NGN', status, relatedTaskId = null, exchangeRate = 1, reference }) {
  return tx.walletEntry.create({
    data: {
      walletId,
      type,
      relatedTaskId,
      grossMinor: BigInt(grossMinor),
      feeMinor: BigInt(feeMinor),
      netMinor: BigInt(netMinor),
      currency,
      status,
      exchangeRate,
      reference: reference || makeReference(type),
    },
  });
}

// Money lifecycle #1 — submission submitted: pay appears as PENDING (not withdrawable).
async function addPending(tx, wallet, payMinor, taskId) {
  const amount = BigInt(payMinor);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { pendingMinor: { increment: amount } },
  });
  return recordEntry(tx, wallet.id, {
    type: 'TASK_PAYMENT',
    grossMinor: amount,
    netMinor: amount,
    currency: wallet.currency,
    status: 'pending',
    relatedTaskId: taskId,
  });
}

// Remove a pending amount (rejection / revision — no money moves to withdrawable).
async function removePending(tx, wallet, payMinor, taskId, status) {
  const amount = BigInt(payMinor);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { pendingMinor: { decrement: amount } },
  });
  return recordEntry(tx, wallet.id, {
    type: 'TASK_PAYMENT',
    grossMinor: amount,
    netMinor: 0n,
    currency: wallet.currency,
    status, // 'rejected' | 'revision'
    relatedTaskId: taskId,
  });
}

// Money lifecycle #2 — approval: move PENDING -> APPROVED/WITHDRAWABLE.
// The caller MUST have confirmed the task escrow is funded before calling this.
async function approveEarning(tx, wallet, payMinor, taskId) {
  const amount = BigInt(payMinor);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      pendingMinor: { decrement: amount },
      approvedMinor: { increment: amount },
      withdrawableMinor: { increment: amount },
      totalEarnedMinor: { increment: amount },
    },
  });
  return recordEntry(tx, wallet.id, {
    type: 'TASK_PAYMENT',
    grossMinor: amount,
    netMinor: amount,
    currency: wallet.currency,
    status: 'approved',
    relatedTaskId: taskId,
  });
}

// Deduct spendable balance for a withdrawal or bill (checked by caller).
async function debitWithdrawable(tx, wallet, amountMinor) {
  const amount = BigInt(amountMinor);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      withdrawableMinor: { decrement: amount },
      approvedMinor: { decrement: amount },
    },
  });
}

// Credit spendable balance back (withdrawal reversal / bill reversal).
async function creditWithdrawable(tx, wallet, amountMinor) {
  const amount = BigInt(amountMinor);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      withdrawableMinor: { increment: amount },
      approvedMinor: { increment: amount },
      refundMinor: { increment: amount },
    },
  });
}

// Promo / referral credit — lands ONLY in promoCreditMinor, never withdrawable.
async function addPromoCredit(tx, wallet, amountMinor, reference) {
  const amount = BigInt(amountMinor);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { promoCreditMinor: { increment: amount } },
  });
  return recordEntry(tx, wallet.id, {
    type: 'PROMO',
    grossMinor: amount,
    netMinor: amount,
    currency: wallet.currency,
    status: 'credited',
    reference,
  });
}

// Plan purchase ledger entry. Records the spend only — creates ZERO earnings.
async function recordSubscription(tx, wallet, amountMinor, reference) {
  const amount = BigInt(amountMinor);
  return recordEntry(tx, wallet.id, {
    type: 'SUBSCRIPTION',
    grossMinor: amount,
    netMinor: amount,
    currency: wallet.currency,
    status: 'paid',
    reference,
  });
}

module.exports = {
  ensureWallet,
  recordEntry,
  addPending,
  removePending,
  approveEarning,
  debitWithdrawable,
  creditWithdrawable,
  addPromoCredit,
  recordSubscription,
};
