const crypto = require('crypto');

// Human-ish unique reference for ledger entries, withdrawals, etc.
function makeReference(prefix = 'TXN') {
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

module.exports = { makeReference };
