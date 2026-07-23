# Deploying Taskryse

Two supported paths. They share the same code — only the runtime differs.

| | docker-compose | Vercel |
|---|---|---|
| Runs | Postgres + API + frontend on one host | Frontend (static) + API (serverless) |
| Database | bundled Postgres container | **you provide** a managed Postgres |
| Best for | local dev, a VM, Render/Railway/Fly | zero-ops hosting of the web app |

> Vercel does **not** run `docker-compose` and cannot host a database. On Vercel the
> API runs as serverless functions and must point at a managed Postgres (Neon, Supabase,
> Vercel Postgres, …). If you'd rather keep the Express server long-lived, deploy the
> Docker image to Render/Railway/Fly and host only the frontend on Vercel (set
> `VITE_API_BASE` — see below).

---

## Option A — docker-compose (full stack)

Requirements: Docker with the Compose plugin.

```bash
# from the repo root
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:4000 (health at `/health`)
- Postgres: exposed on localhost:5433 (inside the network it's `db:5432`)

What happens on first boot: the `backend` service waits for Postgres, runs
`prisma migrate deploy`, and seeds the demo data once (idempotent — it skips seeding if
plans already exist). nginx in the `frontend` image serves the built SPA and proxies
`/api` to the backend, so everything is one origin.

Sign in with a demo account (password `Password123!`): `adaeze@example.com` (contributor,
withdrawal PIN `1234`), `reviewer@taskryse.com`, `sponsor@meridian.ai`, `admin@taskryse.com`.

Common commands:

```bash
docker compose up --build -d     # background
docker compose logs -f backend   # follow API logs
docker compose down              # stop (keeps the db volume)
docker compose down -v           # stop and wipe the database
```

Set a real `JWT_SECRET` in production (any long random string). The compose file reads it
from the environment and falls back to a placeholder only for local convenience.

---

## Option B — Vercel (frontend + serverless API)

This repo is Vercel-importable as-is:

- `api/index.js` exports the Express app as a serverless function.
- `vercel.json` builds the frontend to `frontend/dist` and rewrites `/api/*` to the function.
- Prisma is generated for the serverless runtime (`rhel-openssl-3.0.x` binary target is
  already declared in `prisma/schema.prisma`).

### 1. Create a managed Postgres

Any Postgres works. For serverless, use a **pooled** connection string (recommended:
[Neon](https://neon.tech) or [Supabase](https://supabase.com), which provide pgBouncer).
Copy its connection URL.

### 2. Import the repo on Vercel

New Project → import this Git repo → keep the **root** directory (do not set it to
`frontend`). Vercel picks up `vercel.json` automatically.

### 3. Set environment variables (Project → Settings → Environment Variables)

| Name | Value |
|------|-------|
| `DATABASE_URL` | your pooled Postgres URL (`postgresql://…?sslmode=require`) |
| `JWT_SECRET` | a long random string |
| `NODE_ENV` | `production` |

### 4. Initialise the database (once)

The build does **not** touch your database. Apply the schema and seed from your machine,
pointed at the same `DATABASE_URL`:

```bash
DATABASE_URL="<your prod url>" npx prisma migrate deploy
DATABASE_URL="<your prod url>" npm run seed        # optional demo data
```

### 5. Deploy

Trigger a deploy (push to the connected branch, or "Deploy" in the dashboard). The
frontend calls the API at the same origin (`/api/v1`), so no extra config is needed.

### Notes & gotchas

- **Pooled connections matter.** Each serverless invocation may open a DB connection;
  an unpooled URL will exhaust Postgres under load. Use the provider's pooled URL.
- **Cold starts.** The first request after idle is slower while the function warms.
- **Prisma engine.** If a deploy ever fails to find the query engine, confirm the build
  ran `prisma generate` (it does via `vercel.json`) and that `rhel-openssl-3.0.x` is in
  `binaryTargets`.

---

## Split option — frontend on Vercel, API on a container host

If you prefer the long-lived Express server, deploy the backend `Dockerfile` to
Render/Railway/Fly (they build the image and run `node src/server.js`), then host the
frontend on Vercel and point it at that API:

- Vercel project root: `frontend`
- Build-time env var: `VITE_API_BASE=https://<your-api-host>/api/v1`

The API already sends permissive CORS headers, and the client attaches the JWT as a
Bearer token, so cross-origin calls work.
