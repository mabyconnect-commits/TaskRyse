const { hasScope } = require('../lib/rbac');
const { forbidden } = require('../lib/errors');

// requireScope('wallet:withdraw') — gate an endpoint on a permission scope.
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.user) return next(forbidden('Authentication required'));
    if (!hasScope(req.user.role, scope)) {
      return next(forbidden(`Missing required scope: ${scope}`, 'missing_scope'));
    }
    next();
  };
}

// requireRole('ADMIN', 'SUPPORT') — gate on membership in an explicit role set.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(forbidden('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Requires role: ${roles.join(' or ')}`, 'wrong_role'));
    }
    next();
  };
}

module.exports = { requireScope, requireRole };
