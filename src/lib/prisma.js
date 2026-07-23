// Single shared Prisma client instance.
//
// In a long-running server this is just a module singleton. In a serverless runtime
// (e.g. Vercel), modules are cached per warm container, so we stash the client on
// globalThis to avoid opening a new pool on every invocation / hot reload.
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__taskrysePrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__taskrysePrisma = prisma;
}

module.exports = prisma;
