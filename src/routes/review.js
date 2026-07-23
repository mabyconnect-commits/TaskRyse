const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireScope } = require('../middleware/authorize');
const { ensureWallet, approveEarning, removePending } = require('../lib/wallet');
const { recomputeRyseLevel } = require('../lib/ryse');
const { audit } = require('../lib/audit');
const { sendJson } = require('../lib/serialize');
const { notFound, forbidden, conflict } = require('../lib/errors');

const router = express.Router();

// GET /review-queue — reviewer/sponsor work queue.
// Reviewers: submissions under review, EXCLUDING tasks they contributed to,
// with NO payment amounts. Sponsors: their org's submissions, amounts visible.
router.get('/review-queue', requireScope('review:queue'), asyncHandler(async (req, res) => {
  const isReviewer = req.user.role === 'REVIEWER';

  const submissions = await prisma.submission.findMany({
    where: {
      assignment: { status: { in: ['UNDER_REVIEW', 'SUBMITTED'] } },
      review: null,
    },
    include: { assignment: { include: { task: { include: { org: true } } } } },
    orderBy: { submittedAt: 'asc' },
  });

  const queue = [];
  for (const s of submissions) {
    const task = s.assignment.task;
    // Reviewers never review tasks they contributed to.
    if (isReviewer && s.assignment.contributorId === req.user.id) continue;
    // Sponsors only see their own org's submissions.
    if (req.user.role === 'SPONSOR') {
      const member = await prisma.orgMember.findFirst({ where: { orgId: task.sponsorOrgId, userId: req.user.id } });
      if (!member) continue;
    }
    const item = {
      submissionId: s.id,
      assignmentId: s.assignmentId,
      taskId: task.id,
      taskTitle: task.title,
      difficulty: task.difficulty,
      reviewType: task.reviewType,
      submittedAt: s.submittedAt,
      evidence: s.evidence,
    };
    // Payment amounts are hidden from reviewers.
    if (!isReviewer) {
      item.payMinor = task.payMinor;
      item.currency = task.currency;
    }
    queue.push(item);
  }
  return sendJson(res, 200, queue);
}));

// Shared loader: submission with assignment/task, guarding reviewer conflicts.
async function loadForDecision(tx, submissionId, user) {
  const s = await tx.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { task: true } }, review: true },
  });
  if (!s) throw notFound('Submission not found');
  if (user.role === 'REVIEWER' && s.assignment.contributorId === user.id) {
    throw forbidden('Cannot review your own contribution', 'self_review');
  }
  if (user.role === 'SPONSOR') {
    const member = await tx.orgMember.findFirst({ where: { orgId: s.assignment.task.sponsorOrgId, userId: user.id } });
    if (!member) throw forbidden('Not a member of the sponsoring organisation');
  }
  return s;
}

const decisionSchema = z.object({ rubricScores: z.any().optional(), note: z.string().optional() });

// POST /submissions/:id/approve — Money lifecycle #2.
// Move pending -> withdrawable ONLY if the task's escrow is funded.
router.post('/submissions/:id/approve', requireScope('review:decide'), asyncHandler(async (req, res) => {
  const body = parseBody(decisionSchema, req.body);

  const out = await prisma.$transaction(async (tx) => {
    const s = await loadForDecision(tx, req.params.id, req.user);
    if (s.review) throw conflict('Submission already reviewed', 'already_reviewed');

    const task = s.assignment.task;
    const pay = BigInt(task.payMinor);
    const availableEscrow = BigInt(task.escrowFundedMinor) - BigInt(task.escrowSpentMinor);
    const escrowFunded = availableEscrow >= pay;

    await tx.review.create({
      data: {
        submissionId: s.id,
        reviewerId: req.user.id,
        rubricScores: body.rubricScores || {},
        decision: 'APPROVED',
        note: body.note,
      },
    });
    await tx.assignment.update({ where: { id: s.assignmentId }, data: { status: 'APPROVED' } });

    const wallet = await ensureWallet(tx, s.assignment.contributorId, task.currency);
    let released = false;
    if (escrowFunded) {
      // Release: pending -> withdrawable, and spend the task escrow.
      await approveEarning(tx, wallet, task.payMinor, task.id);
      await tx.task.update({ where: { id: task.id }, data: { escrowSpentMinor: { increment: pay } } });
      released = true;
    }
    // If escrow is not funded, approval stands but the money stays PENDING.

    await audit(tx, {
      actor: req.user.id,
      action: 'submission.approve',
      target: s.id,
      meta: { taskId: task.id, released, payMinor: task.payMinor },
    });

    return { escrowFunded, released, contributorId: s.assignment.contributorId };
  });

  // Recompute the contributor's derived Ryse level after an approval.
  await recomputeRyseLevel(out.contributorId);

  return sendJson(res, 200, {
    decision: 'APPROVED',
    earningsReleased: out.released,
    note: out.released
      ? 'Approved and released: pending moved to withdrawable against funded escrow.'
      : 'Approved, but sponsor escrow is not yet funded — earnings remain pending until escrow clears.',
  });
}));

// POST /submissions/:id/revision — request changes. No money moves; pending removed.
router.post('/submissions/:id/revision', requireScope('review:decide'), asyncHandler(async (req, res) => {
  const body = parseBody(decisionSchema, req.body);
  await prisma.$transaction(async (tx) => {
    const s = await loadForDecision(tx, req.params.id, req.user);
    if (s.review) throw conflict('Submission already reviewed', 'already_reviewed');
    const task = s.assignment.task;
    await tx.review.create({
      data: { submissionId: s.id, reviewerId: req.user.id, rubricScores: body.rubricScores || {}, decision: 'REVISION', note: body.note },
    });
    await tx.assignment.update({ where: { id: s.assignmentId }, data: { status: 'REVISION_REQUESTED' } });
    // Remove the pending amount that was staged at submit (no money moves).
    const wallet = await ensureWallet(tx, s.assignment.contributorId, task.currency);
    await removePending(tx, wallet, task.payMinor, task.id, 'revision');
    await audit(tx, { actor: req.user.id, action: 'submission.revision', target: s.id });
  });
  return sendJson(res, 200, { decision: 'REVISION', note: 'Revision requested. No money moved; contributor may resubmit.' });
}));

// POST /submissions/:id/reject — reject. No money moves; pending removed.
router.post('/submissions/:id/reject', requireScope('review:decide'), asyncHandler(async (req, res) => {
  const body = parseBody(decisionSchema, req.body);
  await prisma.$transaction(async (tx) => {
    const s = await loadForDecision(tx, req.params.id, req.user);
    if (s.review) throw conflict('Submission already reviewed', 'already_reviewed');
    const task = s.assignment.task;
    await tx.review.create({
      data: { submissionId: s.id, reviewerId: req.user.id, rubricScores: body.rubricScores || {}, decision: 'REJECTED', note: body.note },
    });
    await tx.assignment.update({ where: { id: s.assignmentId }, data: { status: 'REJECTED' } });
    const wallet = await ensureWallet(tx, s.assignment.contributorId, task.currency);
    await removePending(tx, wallet, task.payMinor, task.id, 'rejected');
    await audit(tx, { actor: req.user.id, action: 'submission.reject', target: s.id });
  });
  return sendJson(res, 200, { decision: 'REJECTED', note: 'Rejected. Contributor may appeal.' });
}));

const flagSchema = z.object({ reason: z.string() });

// POST /submissions/:id/flag — flag fraud: hold the assignment and open a fraud case.
router.post('/submissions/:id/flag', requireScope('fraud:flag'), asyncHandler(async (req, res) => {
  const body = parseBody(flagSchema, req.body);
  const out = await prisma.$transaction(async (tx) => {
    const s = await loadForDecision(tx, req.params.id, req.user);
    const task = s.assignment.task;
    // Upsert-ish: record a FLAGGED review if none exists yet.
    if (!s.review) {
      await tx.review.create({
        data: { submissionId: s.id, reviewerId: req.user.id, rubricScores: {}, decision: 'FLAGGED', note: body.reason },
      });
    }
    await tx.assignment.update({ where: { id: s.assignmentId }, data: { status: 'DISPUTED' } });
    // Remove pending — the payout is held pending admin review.
    const wallet = await ensureWallet(tx, s.assignment.contributorId, task.currency);
    await removePending(tx, wallet, task.payMinor, task.id, 'held_fraud');
    const fraud = await tx.fraudCase.create({
      data: { userId: s.assignment.contributorId, submissionId: s.id, reason: body.reason, status: 'OPEN' },
    });
    await audit(tx, { actor: req.user.id, action: 'submission.flag', target: s.id, meta: { fraudCaseId: fraud.id } });
    return fraud;
  });
  return sendJson(res, 200, { decision: 'FLAGGED', fraudCaseId: out.id, note: 'Held for admin risk review.' });
}));

const escalateSchema = z.object({ reason: z.string().optional() });

// POST /reviews/:id/escalate — escalate a review to admin/senior reviewer.
router.post('/reviews/:id/escalate', requireScope('review:escalate'), asyncHandler(async (req, res) => {
  const body = parseBody(escalateSchema, req.body);
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw notFound('Review not found');
  await audit(prisma, { actor: req.user.id, action: 'review.escalate', target: review.id, meta: { reason: body.reason } });
  return sendJson(res, 200, { escalated: true, reviewId: review.id });
}));

const appealSchema = z.object({ reason: z.string() });

// POST /submissions/:id/appeal — contributor appeals -> independent second reviewer.
router.post('/submissions/:id/appeal', requireScope('appeal:create'), asyncHandler(async (req, res) => {
  const body = parseBody(appealSchema, req.body);
  const s = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { assignment: true, appeal: true },
  });
  if (!s) throw notFound('Submission not found');
  if (s.assignment.contributorId !== req.user.id) throw forbidden('Not your submission');
  if (s.appeal) throw conflict('Appeal already open', 'appeal_exists');

  const appeal = await prisma.appeal.create({
    data: { submissionId: s.id, contributorId: req.user.id, reason: body.reason, status: 'UNDER_REVIEW' },
  });
  await prisma.assignment.update({ where: { id: s.assignmentId }, data: { status: 'DISPUTED' } });
  return sendJson(res, 201, { appealId: appeal.id, status: appeal.status, note: 'Routed to an independent second reviewer.' });
}));

module.exports = router;
