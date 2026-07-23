#!/bin/sh
# Wait for Postgres, apply migrations, seed once (idempotent), then run the server.
set -e

echo "[entrypoint] waiting for database…"
# Derive host:port from DATABASE_URL, fall back to the compose service name.
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

i=0
until node -e "require('net').createConnection({host:process.env.DB_HOST||'db',port:process.env.DB_PORT||5432}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then echo "[entrypoint] database not reachable, giving up"; exit 1; fi
  sleep 1
done
echo "[entrypoint] database is up."

echo "[entrypoint] applying migrations…"
npx prisma migrate deploy

# Seed only when the database is empty (first boot). Safe to re-run.
echo "[entrypoint] seeding if empty…"
node -e "
const p = require('@prisma/client');
const db = new p.PrismaClient();
db.plan.count().then(async (n) => {
  if (n === 0) { console.log('[entrypoint] empty DB -> seeding'); }
  else { console.log('[entrypoint] already seeded (' + n + ' plans), skipping'); }
  await db.\$disconnect();
  process.exit(n === 0 ? 10 : 0);
}).catch(async () => { await db.\$disconnect(); process.exit(10); });
" || SEED=$?
if [ "${SEED:-0}" = "10" ]; then
  node prisma/seed.js || echo "[entrypoint] seed failed (continuing)"
fi

echo "[entrypoint] starting API…"
exec "$@"
