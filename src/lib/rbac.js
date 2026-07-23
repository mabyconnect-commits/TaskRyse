// Role -> permission-scope map. Endpoints declare the scope they require and
// requireScope() enforces it. ADMIN is permission-gated but holds every scope.
//
// Mirrors the roles/permissions table in BACKEND_SPEC.md §1.
const SCOPES_BY_ROLE = {
  CONTRIBUTOR: [
    'tasks:browse', 'tasks:accept', 'work:submit', 'wallet:read', 'wallet:withdraw',
    'bills:pay', 'learning:read', 'referrals:create', 'tickets:write', 'qualification:attempt',
    'kyc:submit', 'payout:manage', 'subscription:manage', 'appeal:create',
  ],
  SPONSOR: [
    'tasks:browse', 'org:manage', 'campaign:manage', 'campaign:fund', 'review:queue',
    'review:decide', 'analytics:read', 'tickets:write', 'wallet:read',
  ],
  REVIEWER: [
    'review:queue', 'review:decide', 'fraud:flag', 'review:escalate', 'tickets:write',
  ],
  SUPPORT: [
    'tickets:read', 'tickets:write', 'tickets:resolve', 'ticket:escalate', 'refund:request',
  ],
  ADMIN: ['*'],
};

function scopesFor(role) {
  return SCOPES_BY_ROLE[role] || [];
}

function hasScope(role, scope) {
  const scopes = scopesFor(role);
  return scopes.includes('*') || scopes.includes(scope);
}

module.exports = { SCOPES_BY_ROLE, scopesFor, hasScope };
