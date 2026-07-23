// Prisma returns BigInt for money columns. JSON.stringify can't serialize BigInt,
// so we recursively convert BigInt -> Number for API responses. Money is in minor
// units (kobo/cents), comfortably within Number.MAX_SAFE_INTEGER for this domain.
function serialize(value) {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

// Express res.json() wrapper that BigInt-safely serializes.
function sendJson(res, status, payload) {
  return res.status(status).json(serialize(payload));
}

module.exports = { serialize, sendJson };
