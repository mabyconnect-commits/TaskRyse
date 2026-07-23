// Append an immutable audit-log row. Every privileged mutation (admin/* and money
// endpoints) MUST call this. `tx` may be a Prisma transaction client or the base client.
async function audit(tx, { actor, action, target, meta }) {
  return tx.auditLog.create({
    data: {
      actor: actor || 'system',
      action,
      target: target || '',
      meta: meta || undefined,
    },
  });
}

module.exports = { audit };
