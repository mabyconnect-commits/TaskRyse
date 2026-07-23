const prisma = require('../lib/prisma');
const { verifyToken } = require('../lib/auth');
const { unauthorized, forbidden } = require('../lib/errors');

// Populates req.user from a Bearer JWT. Rejects frozen/deleted accounts.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized('Missing bearer token');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized('User not found');
    if (user.status === 'DELETED') throw forbidden('Account deleted');
    if (user.status === 'FROZEN') throw forbidden('Account frozen', 'account_frozen');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
