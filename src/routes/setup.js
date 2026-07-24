const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { sendJson } = require('../lib/serialize');
const { forbidden } = require('../lib/errors');
const config = require('../lib/config');
const initSql = require('../lib/initSql');

const router = express.Router();

// Split the init SQL into individual statements. Full-line comments are stripped
// first, and there are no semicolons inside string literals in this file, so a plain
// split on ';' is safe. BEGIN/COMMIT are dropped (each statement auto-commits).
function splitStatements(sql) {
  const noComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return noComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^(BEGIN|COMMIT)$/i.test(s));
}

// GET /setup?key=<JWT_SECRET> — one-time database initialisation.
// Creates all tables and loads the demo data. Idempotent: if the schema already
// exists it reports the current state instead of re-running. Gated by JWT_SECRET so
// only the operator can trigger it. Safe to remove once the database is set up.
router.get('/setup', asyncHandler(async (req, res) => {
  if (!req.query.key || req.query.key !== config.jwtSecret) {
    throw forbidden('Invalid setup key', 'bad_setup_key');
  }

  // Already initialised? (User table exists and is queryable.)
  try {
    const users = await prisma.user.count();
    if (users > 0) {
      return sendJson(res, 200, {
        status: 'already_initialized',
        users,
        message: 'Database already set up. You can sign in now.',
      });
    }
  } catch {
    // Table doesn't exist yet — fall through and initialise.
  }

  const statements = splitStatements(initSql);
  let ran = 0;
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      ran += 1;
    } catch (err) {
      const msg = String((err && err.message) || '');
      // Ignore "already exists" so re-runs are harmless; surface anything else.
      if (/already exists|duplicate|violates unique/i.test(msg)) continue;
      throw err;
    }
  }

  const [users, plans, tasks] = await Promise.all([
    prisma.user.count(),
    prisma.plan.count(),
    prisma.task.count(),
  ]);

  return sendJson(res, 200, {
    status: 'initialized',
    statementsRun: ran,
    users,
    plans,
    tasks,
    message: 'Database ready. Sign in with adaeze@example.com / Password123!',
  });
}));

module.exports = router;
