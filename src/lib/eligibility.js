// Per-caller task eligibility. Returns one of the OpenAPI Task.eligibility values:
//   ELIGIBLE | QUALIFICATION_REQUIRED | PLAN_LOCKED
//
// A plan unlocks ELIGIBILITY only — category scope, sponsored access, min level.
// It never grants tasks or earnings.
const prisma = require('./prisma');

const RYSE_ORDER = ['NEW', 'ACTIVE', 'SKILLED', 'PRO', 'ELITE'];
const rank = (level) => RYSE_ORDER.indexOf(level);

const FAMILY_TOKEN = {
  AI_DATA: 'ai_data',
  PROFESSIONAL: 'professional',
  SPONSORED: 'sponsored',
};

function categoryInScope(scope, category) {
  if (!scope || scope.length === 0) return false;
  if (scope.includes('all')) return true;
  const token = FAMILY_TOKEN[category.family];
  if (token && scope.includes(token)) return true;
  // slug-token match, e.g. scope 'audio' unlocks category 'audio-transcription'
  const slugTokens = (category.slug || '').split('-');
  return scope.some((s) => slugTokens.includes(s));
}

// Compute eligibility for a task+category against a user, their active plan, and
// whether they hold a passing qualification for the task's category.
function computeEligibility({ task, category, user, plan, hasQualification }) {
  // Country gate: empty countries == open to all.
  if (task.countries && task.countries.length > 0 && !task.countries.includes(user.countryCode)) {
    return 'PLAN_LOCKED';
  }
  // Min Ryse level gate (derived, not purchasable — but still gates access).
  if (rank(user.ryseLevel) < rank(task.minRyseLevel)) {
    return 'PLAN_LOCKED';
  }
  // No active plan -> locked (plan grants category eligibility).
  if (!plan) return 'PLAN_LOCKED';
  // Sponsored tasks require sponsoredAccess on the plan.
  if (task.isSponsored && !plan.sponsoredAccess) return 'PLAN_LOCKED';
  // Category must be within the plan's scope.
  if (!categoryInScope(plan.categoryScope, category)) return 'PLAN_LOCKED';
  // Qualification gate.
  if (task.requiresQualification && !hasQualification) return 'QUALIFICATION_REQUIRED';
  return 'ELIGIBLE';
}

// Load the active plan for a user (or null).
async function activePlan(userId) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (!sub) return null;
  if (sub.status !== 'ACTIVE' && sub.status !== 'GRACE') return null;
  return sub.plan;
}

// Does the user hold a passing qualification for a category?
async function hasPassingQualification(userId, categoryId) {
  const attempt = await prisma.qualificationAttempt.findFirst({
    where: {
      userId,
      passed: true,
      qualification: { categoryId },
    },
  });
  return Boolean(attempt);
}

// Convenience: compute eligibility for a single task loaded with its category.
async function eligibilityForTask(task, user) {
  const category = task.category || (await prisma.taskCategory.findUnique({ where: { id: task.categoryId } }));
  const plan = await activePlan(user.id);
  const hasQualification = task.requiresQualification
    ? await hasPassingQualification(user.id, task.categoryId)
    : true;
  return computeEligibility({ task, category, user, plan, hasQualification });
}

module.exports = {
  RYSE_ORDER,
  computeEligibility,
  categoryInScope,
  activePlan,
  hasPassingQualification,
  eligibilityForTask,
};
