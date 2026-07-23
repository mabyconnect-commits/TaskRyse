const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { requireScope } = require('../middleware/authorize');
const { audit } = require('../lib/audit');
const { sendJson } = require('../lib/serialize');
const { notFound, forbidden, badRequest } = require('../lib/errors');

const router = express.Router();

// Assert the caller is a member of the org.
async function assertOrgMember(orgId, userId) {
  const member = await prisma.orgMember.findFirst({ where: { orgId, userId } });
  if (!member) throw forbidden('Not a member of this organisation');
  return member;
}

const orgSchema = z.object({ name: z.string().min(2) });

// POST /orgs — create an organisation; creator becomes an owner member.
router.post('/orgs', requireScope('org:manage'), asyncHandler(async (req, res) => {
  const body = parseBody(orgSchema, req.body);
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organisation.create({ data: { name: body.name } });
    await tx.orgMember.create({ data: { orgId: created.id, userId: req.user.id, role: 'owner', scopes: ['*'] } });
    return created;
  });
  return sendJson(res, 201, org);
}));

const verifySchema = z.object({ orgId: z.string() });

// POST /orgs/verify — request business verification (pending until admin acts).
router.post('/orgs/verify', requireScope('org:manage'), asyncHandler(async (req, res) => {
  const body = parseBody(verifySchema, req.body);
  await assertOrgMember(body.orgId, req.user.id);
  const org = await prisma.organisation.update({
    where: { id: body.orgId },
    data: { verificationStatus: 'pending_review' },
  });
  return sendJson(res, 200, { orgId: org.id, verificationStatus: org.verificationStatus });
}));

const campaignSchema = z.object({
  orgId: z.string(),
  categoryId: z.string(),
  title: z.string(),
  description: z.string(),
  instructions: z.string(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']).optional(),
  payMinor: z.number().int().positive(),
  totalSlots: z.number().int().positive(),
  currency: z.string().optional(),
  countries: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  requiresQualification: z.boolean().optional(),
  reviewType: z.enum(['MANUAL', 'AUTO', 'TEAM']).optional(),
  isSponsored: z.boolean().optional(),
  minRyseLevel: z.enum(['NEW', 'ACTIVE', 'SKILLED', 'PRO', 'ELITE']).optional(),
  deadline: z.string().optional(),
  platformFeeMinor: z.number().int().nonnegative().optional(),
  objective: z.string().optional(),
});

// POST /campaigns — create a task + funding campaign (task starts DRAFT until funded).
router.post('/campaigns', requireScope('campaign:manage'), asyncHandler(async (req, res) => {
  const body = parseBody(campaignSchema, req.body);
  await assertOrgMember(body.orgId, req.user.id);
  const category = await prisma.taskCategory.findUnique({ where: { id: body.categoryId } });
  if (!category) throw badRequest('Unknown category', 'bad_category');

  const rewardPoolMinor = BigInt(body.payMinor) * BigInt(body.totalSlots);
  const created = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        sponsorOrgId: body.orgId,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
        instructions: body.instructions,
        difficulty: body.difficulty || 'BEGINNER',
        payMinor: body.payMinor,
        currency: body.currency || 'NGN',
        deadline: body.deadline ? new Date(body.deadline) : null,
        totalSlots: body.totalSlots,
        countries: body.countries || [],
        requiredSkills: body.requiredSkills || [],
        requiresQualification: body.requiresQualification || false,
        reviewType: body.reviewType || 'MANUAL',
        isSponsored: body.isSponsored || false,
        minRyseLevel: body.minRyseLevel || 'NEW',
        status: 'DRAFT',
      },
    });
    const campaign = await tx.campaign.create({
      data: {
        orgId: body.orgId,
        taskId: task.id,
        rewardPoolMinor,
        platformFeeMinor: BigInt(body.platformFeeMinor || 0),
        objective: body.objective,
        status: 'draft',
      },
    });
    await audit(tx, { actor: req.user.id, action: 'campaign.create', target: campaign.id, meta: { taskId: task.id } });
    return { task, campaign };
  });
  return sendJson(res, 201, created);
}));

const fundSchema = z.object({ amountMinor: z.number().int().positive() });

// POST /campaigns/:id/fund — fund escrow. Money endpoint -> audit-logged.
// Funding raises org escrow AND the task's per-task escrow, and (once fully funded)
// makes the task LIVE. Approved earnings can only be released against this escrow.
router.post('/campaigns/:id/fund', requireScope('campaign:fund'), asyncHandler(async (req, res) => {
  const body = parseBody(fundSchema, req.body);
  const out = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({ where: { id: req.params.id }, include: { task: true } });
    if (!campaign) throw notFound('Campaign not found');
    await assertOrgMember(campaign.orgId, req.user.id);

    const amount = BigInt(body.amountMinor);
    const updatedCampaign = await tx.campaign.update({
      where: { id: campaign.id },
      data: { fundedMinor: { increment: amount }, status: 'funded' },
    });
    await tx.organisation.update({ where: { id: campaign.orgId }, data: { escrowBalanceMinor: { increment: amount } } });
    await tx.task.update({ where: { id: campaign.taskId }, data: { escrowFundedMinor: { increment: amount } } });

    // Fully funded reward pool -> task goes LIVE.
    const fullyFunded = BigInt(updatedCampaign.fundedMinor) >= BigInt(campaign.rewardPoolMinor);
    if (fullyFunded && campaign.task.status === 'DRAFT') {
      await tx.task.update({ where: { id: campaign.taskId }, data: { status: 'LIVE' } });
    }

    await audit(tx, { actor: req.user.id, action: 'campaign.fund', target: campaign.id, meta: { amountMinor: body.amountMinor, fullyFunded } });
    return { updatedCampaign, fullyFunded };
  });
  return sendJson(res, 200, {
    campaignId: out.updatedCampaign.id,
    fundedMinor: out.updatedCampaign.fundedMinor,
    fullyFunded: out.fullyFunded,
    taskLive: out.fullyFunded,
  });
}));

// GET /campaigns/:id/analytics — funnel + spend analytics for the sponsor.
router.get('/campaigns/:id/analytics', requireScope('analytics:read'), asyncHandler(async (req, res) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id }, include: { task: true } });
  if (!campaign) throw notFound('Campaign not found');
  await assertOrgMember(campaign.orgId, req.user.id);

  const task = campaign.task;
  const [accepted, submitted, approved, rejected] = await Promise.all([
    prisma.assignment.count({ where: { taskId: task.id } }),
    prisma.assignment.count({ where: { taskId: task.id, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'] } } }),
    prisma.assignment.count({ where: { taskId: task.id, status: 'APPROVED' } }),
    prisma.assignment.count({ where: { taskId: task.id, status: 'REJECTED' } }),
  ]);

  return sendJson(res, 200, {
    campaignId: campaign.id,
    taskId: task.id,
    funnel: { accepted, submitted, approved, rejected },
    slots: { total: task.totalSlots, taken: task.slotsTaken },
    escrow: {
      rewardPoolMinor: campaign.rewardPoolMinor,
      fundedMinor: campaign.fundedMinor,
      spentMinor: task.escrowSpentMinor,
      currency: task.currency,
    },
  });
}));

// GET /invoices — funding/spend invoices for the caller's orgs.
router.get('/invoices', requireScope('analytics:read'), asyncHandler(async (req, res) => {
  const memberships = await prisma.orgMember.findMany({ where: { userId: req.user.id } });
  const orgIds = memberships.map((m) => m.orgId);
  const campaigns = await prisma.campaign.findMany({ where: { orgId: { in: orgIds } }, include: { task: true } });
  const invoices = campaigns.map((c) => ({
    campaignId: c.id,
    taskTitle: c.task ? c.task.title : null,
    rewardPoolMinor: c.rewardPoolMinor,
    platformFeeMinor: c.platformFeeMinor,
    fundedMinor: c.fundedMinor,
    status: c.status,
    createdAt: c.createdAt,
  }));
  return sendJson(res, 200, invoices);
}));

module.exports = router;
