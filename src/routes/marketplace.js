const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireScope } = require('../middleware/authorize');
const {
  computeEligibility, activePlan, hasPassingQualification,
} = require('../lib/eligibility');
const { sendJson } = require('../lib/serialize');
const { notFound, conflict } = require('../lib/errors');

const router = express.Router();

// GET /tasks — marketplace listing with per-caller eligibility.
router.get('/tasks', asyncHandler(async (req, res) => {
  const { category, difficulty, minPay, country, qualification } = req.query;

  const where = { status: 'LIVE' };
  if (category) where.categoryId = String(category);
  if (difficulty) where.difficulty = String(difficulty).toUpperCase();
  if (minPay) where.payMinor = { gte: parseInt(String(minPay), 10) };
  if (country) where.countries = { has: String(country) };
  if (qualification !== undefined) where.requiresQualification = String(qualification) === 'true';

  const tasks = await prisma.task.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  // Compute eligibility once per caller using their plan + qualifications.
  const plan = await activePlan(req.user.id);
  const results = [];
  for (const task of tasks) {
    const hasQual = task.requiresQualification
      ? await hasPassingQualification(req.user.id, task.categoryId)
      : true;
    const eligibility = computeEligibility({
      task, category: task.category, user: req.user, plan, hasQualification: hasQual,
    });
    results.push({
      id: task.id,
      title: task.title,
      categoryId: task.categoryId,
      difficulty: task.difficulty,
      payMinor: task.payMinor,
      currency: task.currency,
      deadline: task.deadline,
      totalSlots: task.totalSlots,
      slotsTaken: task.slotsTaken,
      requiresQualification: task.requiresQualification,
      isSponsored: task.isSponsored,
      eligibility,
    });
  }
  return sendJson(res, 200, results);
}));

// GET /tasks/:id — single task with eligibility.
router.get('/tasks/:id', asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { category: true, org: { select: { id: true, name: true, verificationStatus: true } } },
  });
  if (!task) throw notFound('Task not found');

  const plan = await activePlan(req.user.id);
  const hasQual = task.requiresQualification
    ? await hasPassingQualification(req.user.id, task.categoryId)
    : true;
  const eligibility = computeEligibility({
    task, category: task.category, user: req.user, plan, hasQualification: hasQual,
  });
  return sendJson(res, 200, { ...task, eligibility });
}));

// POST /tasks/:id/accept — checks eligibility, slots, and plan application limit.
router.post('/tasks/:id/accept', requireScope('tasks:accept'), asyncHandler(async (req, res) => {
  const assignment = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: req.params.id }, include: { category: true } });
    if (!task) throw notFound('Task not found');
    if (task.status !== 'LIVE') throw conflict('Task is not open', 'task_not_live');
    if (task.slotsTaken >= task.totalSlots) throw conflict('All slots are full', 'slots_full');

    // No double-accept of the same task while an assignment is active.
    const active = await tx.assignment.findFirst({
      where: {
        taskId: task.id,
        contributorId: req.user.id,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED'] },
      },
    });
    if (active) throw conflict('You already have this task in progress', 'already_accepted');

    // Eligibility (plan scope, qualification, country, level, sponsored access).
    const sub = await tx.subscription.findUnique({ where: { userId: req.user.id }, include: { plan: true } });
    const plan = sub && (sub.status === 'ACTIVE' || sub.status === 'GRACE') ? sub.plan : null;
    const hasQual = task.requiresQualification
      ? Boolean(await tx.qualificationAttempt.findFirst({ where: { userId: req.user.id, passed: true, qualification: { categoryId: task.categoryId } } }))
      : true;
    const eligibility = computeEligibility({ task, category: task.category, user: req.user, plan, hasQualification: hasQual });
    if (eligibility !== 'ELIGIBLE') throw conflict(`Not eligible: ${eligibility}`, eligibility.toLowerCase());

    // Plan application limit (max concurrent active assignments).
    const activeCount = await tx.assignment.count({
      where: {
        contributorId: req.user.id,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED'] },
      },
    });
    if (plan && activeCount >= plan.maxActiveApplications) {
      throw conflict('Active application limit reached for your plan', 'application_limit');
    }

    // Create the assignment and consume a slot.
    const created = await tx.assignment.create({
      data: {
        taskId: task.id,
        contributorId: req.user.id,
        status: 'ACCEPTED',
        deadline: task.deadline,
      },
    });
    await tx.task.update({ where: { id: task.id }, data: { slotsTaken: { increment: 1 } } });

    // Mark the subscription as having accepted a task -> plan refund no longer available.
    if (sub) {
      await tx.subscription.update({ where: { id: sub.id }, data: { hasAcceptedTask: true } });
    }
    return created;
  });

  return sendJson(res, 201, assignment);
}));

const attemptSchema = z.object({ answers: z.array(z.any()).optional(), score: z.number().min(0).max(100).optional() });

// POST /qualifications/:id/attempt — take a qualification; pass unlocks gated tasks.
router.post('/qualifications/:id/attempt', requireScope('qualification:attempt'), asyncHandler(async (req, res) => {
  const body = parseBody(attemptSchema, req.body);
  const qualification = await prisma.qualification.findUnique({ where: { id: req.params.id } });
  if (!qualification) throw notFound('Qualification not found');

  // Respect any active retake cooldown from a prior failed attempt.
  const last = await prisma.qualificationAttempt.findFirst({
    where: { userId: req.user.id, qualificationId: qualification.id },
    orderBy: { takenAt: 'desc' },
  });
  if (last && !last.passed && last.retakeAfter && last.retakeAfter > new Date()) {
    throw conflict('Retake not yet available', 'retake_cooldown');
  }

  const score = body.score ?? (body.answers ? Math.min(100, body.answers.length * 25) : 0);
  const passed = score >= qualification.passThreshold;
  const attempt = await prisma.qualificationAttempt.create({
    data: {
      userId: req.user.id,
      qualificationId: qualification.id,
      score,
      passed,
      retakeAfter: passed ? null : new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  return sendJson(res, 200, { attempt, passed, passThreshold: qualification.passThreshold });
}));

module.exports = router;
