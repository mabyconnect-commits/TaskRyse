# Taskryse — Frontend

React + TypeScript + Vite single-page app for the Taskryse platform, wired to the
backend REST API. Styled with the handoff's design tokens (Indigo/orange/green,
Sora + Albert Sans).

## Run it

The frontend talks to the backend through a dev proxy, so start the API first.

```bash
# 1. From the repo root, start the backend (Postgres running, migrated, seeded):
npm install && npx prisma migrate dev && npx prisma db seed && npm start   # :4000

# 2. In this folder, start the frontend:
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`vite.config.ts` proxies `/api` → `http://localhost:4000`, so the browser hits a single
origin and there are no CORS issues in development. Sign in with the seeded demo accounts
(password `Password123!`) — the login screen has one-click buttons for each role.

```bash
npm run build      # type-check (tsc) + production bundle into dist/
npm run preview    # serve the production build
```

## How it connects

- `src/lib/api.ts` — typed fetch client. Adds `Authorization: Bearer <JWT>` from
  `localStorage`, parses the backend's `{ code, message }` errors into `ApiError`.
- `src/context/AuthContext.tsx` — login/logout + session restore by decoding the JWT.
- `src/lib/useApi.ts` — tiny loading/error/reload hook used by every page.
- `src/components/Layout.tsx` — role-aware navigation (contributors see the marketplace
  and wallet; reviewers see the queue; sponsors see business; admins see admin).

## Pages

| Route | What it does | API |
|-------|--------------|-----|
| `/login` | Sign in (demo account shortcuts) | `POST /auth/login` |
| `/` | Dashboard: wallet + ryse + eligible-task summary | `/wallet`, `/ryse-level`, `/tasks` |
| `/marketplace` | Task list with per-caller eligibility badges | `GET /tasks` |
| `/task/:id` | Task detail + accept | `GET /tasks/:id`, `POST /tasks/:id/accept` |
| `/workspace` | Accepted tasks; submit work → pending | `GET /assignments`, `POST /assignments/:id/submit` |
| `/wallet` | Balances, transactions, withdraw (PIN+OTP), pay bills | `/wallet`, `/transactions`, `/withdrawals`, `/bills/pay` |
| `/plans` | Plan catalogue + subscribe (eligibility only) | `GET /plans`, `POST /subscriptions` |
| `/ryse` | Derived Ryse level + metrics | `GET /ryse-level` |
| `/review` | Reviewer/sponsor queue; approve/revision/reject | `/review-queue`, `/submissions/:id/*` |
| `/business` | Orgs, create campaign, fund escrow | `/orgs`, `/categories`, `/campaigns`, `/campaigns/:id/fund` |
| `/admin` | Audit log, KYC queue, withdrawals, fraud | `/admin/*` |

The money rules are enforced server-side; the UI simply reflects them — e.g. the wallet
shows promo credit as a separate, non-withdrawable balance, and the review queue hides
payment amounts from reviewers.
