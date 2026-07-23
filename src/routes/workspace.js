const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireScope } = require('../middleware/authorize');
const { ensureWallet, addPending } = require('../lib/wallet');
const { sendJson } = require('../lib/serialize');
const { notFound, forbidden, conflict, badRequest } = require('../lib/errors');

const router = express.Router();

// Load an assignment and assert the caller owns it.
async function ownedAssignment(tx, id, userId) {
  const a = await tx.assignment.findUnique({ where: { id }, include: { task: true, submission: true } });
  if (!a) throw notFound('Assignment not found');
  if (a.contributorId !== userId) throw forbidden('Not your assignment');
  return a;
}

const autosaveSchema = z.object({ payload: z.any() });

// PATCH /assignments/:id/autosave — persist in-progress work.
router.patch('/assignments/:id/autosave', requireScope('work:submit'), asyncHandler(async (req, res) => {
  const body = parseBody(autosaveSchema, req.body);
  const a = await ownedAssignment(prisma, req.params.id, req.user.id);
  if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(a.status)) {
    throw conflict('Cannot edit a submitted assignment', 'not_editable');
  }
  const updated = await prisma.assignment.update({
    where: { id: a.id },
    data: { autosavePayload: body.payload, status: a.status === 'ACCEPTED' ? 'IN_PROGRESS' : a.status },
  });
  return sendJson(res, 200, { id: updated.id, status: updated.status, savedAt: new Date().toISOString() });
}));

const submitSchema = z.object({ evidence: z.any(), autoChecks: z.any().optional() });

// POST /assignments/:id/submit — submit work. Money lifecycle #1:
// the task's pay appears as PENDING (not withdrawable).
router.post('/assignments/:id/submit', requireScope('work:submit'), asyncHandler(async (req, res) => {
  const body = parseBody(submitSchema, req.body);

  const result = await prisma.$transaction(async (tx) => {
    const a = await ownedAssignment(tx, req.params.id, req.user.id);
    if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(a.status)) {
      throw conflict('Already submitted', 'already_submitted');
    }
    if (!['ACCEPTED', 'IN_PROGRESS', 'DRAFT', 'REVISION_REQUESTED'].includes(a.status)) {
      throw conflict(`Cannot submit from status ${a.status}`, 'bad_state');
    }

    // Create (or replace) the submission.
    const submission = a.submission
      ? await tx.submission.update({ where: { id: a.submission.id }, data: { evidence: body.evidence, autoChecks: body.autoChecks || undefined, submittedAt: new Date() } })
      : await tx.submission.create({ data: { assignmentId: a.id, evidence: body.evidence, autoChecks: body.autoChecks || undefined } });

    const nextStatus = a.task.reviewType === 'AUTO' ? 'UNDER_REVIEW' : 'UNDER_REVIEW';
    await tx.assignment.update({ where: { id: a.id }, data: { status: nextStatus, submittedAt: new Date() } });

    // Only add pending once (first submission). On a revision resubmit, pending was
    // removed at revision time and is re-added here.
    const wallet = await ensureWallet(tx, req.user.id, a.task.currency);
    await addPending(tx, wallet, a.task.payMinor, a.task.id);

    return { submission, status: nextStatus };
  });

  return sendJson(res, 200, {
    submissionId: result.submission.id,
    status: result.status,
    note: 'Payment is pending review approval and funded escrow. It is not yet withdrawable.',
  });
}));

const clarificationSchema = z.object({ message: z.string() });

// POST /assignments/:id/clarification — ask the sponsor a question about the task.
router.post('/assignments/:id/clarification', requireScope('work:submit'), asyncHandler(async (req, res) => {
  const body = parseBody(clarificationSchema, req.body);
  const a = await ownedAssignment(prisma, req.params.id, req.user.id);
  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user.id,
      type: 'TASK',
      subject: `Clarification: ${a.task.title}`,
      thread: [{ from: req.user.id, at: new Date().toISOString(), message: body.message }],
    },
  });
  return sendJson(res, 201, { ticketId: ticket.id, status: ticket.status });
}));

const reportSchema = z.object({ reason: z.string() });

// POST /tasks/:id/report — report a problem with a task.
router.post('/tasks/:id/report', requireScope('work:submit'), asyncHandler(async (req, res) => {
  const body = parseBody(reportSchema, req.body);
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) throw notFound('Task not found');
  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user.id,
      type: 'TASK',
      subject: `Report: ${task.title}`,
      disputeKind: 'task_report',
      thread: [{ from: req.user.id, at: new Date().toISOString(), message: body.reason }],
    },
  });
  return sendJson(res, 201, { ticketId: ticket.id });
}));

module.exports = router;
