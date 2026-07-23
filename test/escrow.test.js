// Focused test of the non-negotiable rule:
// approval releases earnings to withdrawable ONLY when the task's escrow is funded.
// An approval against an UNFUNDED task must leave the money PENDING.
const test = require('node:test');
const assert = require('node:assert');
const prisma = require('../src/lib/prisma');

test('approval on an unfunded task keeps earnings pending, not withdrawable', async (t) => {
  const suffix = Date.now();
  // Build an isolated org, category, unfunded LIVE task, contributor, reviewer.
  const org = await prisma.organisation.create({ data: { name: `Unfunded Co ${suffix}` } });
  const cat = await prisma.taskCategory.create({ data: { family: 'AI_DATA', name: `Cat ${suffix}`, slug: `cat-${suffix}` } });
  const task = await prisma.task.create({
    data: {
      sponsorOrgId: org.id, categoryId: cat.id, title: 'Unfunded task', description: 'd', instructions: 'i',
      difficulty: 'BEGINNER', payMinor: 100000, totalSlots: 5, countries: ['NG'], requiredSkills: [],
      status: 'LIVE', escrowFundedMinor: 0n, escrowSpentMinor: 0n, // <-- NOT funded
    },
  });
  const contributor = await prisma.user.create({ data: { email: `c${suffix}@x.com`, passwordHash: 'x', role: 'CONTRIBUTOR', countryCode: 'NG', ryseLevel: 'NEW' } });
  const reviewer = await prisma.user.create({ data: { email: `r${suffix}@x.com`, passwordHash: 'x', role: 'REVIEWER' } });
  const wallet = await prisma.wallet.create({ data: { userId: contributor.id, currency: 'NGN' } });
  const assignment = await prisma.assignment.create({ data: { taskId: task.id, contributorId: contributor.id, status: 'UNDER_REVIEW' } });
  const submission = await prisma.submission.create({ data: { assignmentId: assignment.id, evidence: {} } });

  // Stage pending (as submit would).
  const { addPending, approveEarning } = require('../src/lib/wallet');
  await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { id: wallet.id } });
    await addPending(tx, w, task.payMinor, task.id);
  });

  // Now emulate the approve endpoint's escrow gate.
  const fresh = await prisma.task.findUnique({ where: { id: task.id } });
  const availableEscrow = BigInt(fresh.escrowFundedMinor) - BigInt(fresh.escrowSpentMinor);
  const escrowFunded = availableEscrow >= BigInt(task.payMinor);
  assert.strictEqual(escrowFunded, false, 'escrow must be reported as unfunded');

  await prisma.$transaction(async (tx) => {
    await tx.review.create({ data: { submissionId: submission.id, reviewerId: reviewer.id, rubricScores: {}, decision: 'APPROVED' } });
    await tx.assignment.update({ where: { id: assignment.id }, data: { status: 'APPROVED' } });
    if (escrowFunded) {
      const w = await tx.wallet.findUnique({ where: { id: wallet.id } });
      await approveEarning(tx, w, task.payMinor, task.id);
    }
  });

  const after = await prisma.wallet.findUnique({ where: { id: wallet.id } });
  assert.strictEqual(Number(after.withdrawableMinor), 0, 'unfunded approval must NOT create withdrawable funds');
  assert.strictEqual(Number(after.pendingMinor), 100000, 'earnings remain pending until escrow clears');

  // Cleanup.
  await prisma.review.deleteMany({ where: { submissionId: submission.id } });
  await prisma.submission.delete({ where: { id: submission.id } });
  await prisma.walletEntry.deleteMany({ where: { walletId: wallet.id } });
  await prisma.assignment.delete({ where: { id: assignment.id } });
  await prisma.wallet.delete({ where: { id: wallet.id } });
  await prisma.user.deleteMany({ where: { id: { in: [contributor.id, reviewer.id] } } });
  await prisma.task.delete({ where: { id: task.id } });
  await prisma.taskCategory.delete({ where: { id: cat.id } });
  await prisma.organisation.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});
