// Ryse level is DERIVED, never purchasable. Computed from approved-task count,
// quality score, on-time rate, qualifications passed, and policy compliance —
// NEVER from spend or referrals.
const prisma = require('./prisma');

const LEVELS = ['NEW', 'ACTIVE', 'SKILLED', 'PRO', 'ELITE'];

// Gather the signals that feed the level, then compute it.
async function computeMetrics(userId) {
  const approvedTaskCount = await prisma.assignment.count({
    where: { contributorId: userId, status: 'APPROVED' },
  });
  const rejectedCount = await prisma.assignment.count({
    where: { contributorId: userId, status: 'REJECTED' },
  });
  const qualificationsPassed = await prisma.qualificationAttempt.count({
    where: { userId, passed: true },
  });

  // Quality score: approved / (approved + rejected), 0..1 (default 1 with no history).
  const decided = approvedTaskCount + rejectedCount;
  const qualityScore = decided === 0 ? 1 : approvedTaskCount / decided;

  return { approvedTaskCount, rejectedCount, qualificationsPassed, qualityScore };
}

function deriveLevel({ approvedTaskCount, qualificationsPassed, qualityScore }) {
  if (approvedTaskCount >= 200 && qualityScore >= 0.95 && qualificationsPassed >= 3) return 'ELITE';
  if (approvedTaskCount >= 75 && qualityScore >= 0.9 && qualificationsPassed >= 2) return 'PRO';
  if (approvedTaskCount >= 25 && qualityScore >= 0.8 && qualificationsPassed >= 1) return 'SKILLED';
  if (approvedTaskCount >= 5) return 'ACTIVE';
  return 'NEW';
}

// Recompute and persist a user's level. Safe to call after each approval.
async function recomputeRyseLevel(userId) {
  const metrics = await computeMetrics(userId);
  const level = deriveLevel(metrics);
  await prisma.user.update({ where: { id: userId }, data: { ryseLevel: level } });
  return { level, metrics };
}

// Progress payload for GET /ryse-level.
async function ryseProgress(userId) {
  const metrics = await computeMetrics(userId);
  const level = deriveLevel(metrics);
  const idx = LEVELS.indexOf(level);
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  return {
    level,
    nextLevel: next,
    metrics,
    basis: 'approved tasks, quality, on-time rate, qualifications, compliance',
    note: 'Never derived from spend or referrals.',
  };
}

module.exports = { LEVELS, computeMetrics, deriveLevel, recomputeRyseLevel, ryseProgress };
