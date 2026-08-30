# SupportFlow

AI-delegated support ticketing platform.

- **/server** — Node.js + Express + Mongoose + Socket.IO + Gemini API (all secrets live here)
- **/client** — React + Vite + TypeScript + Tailwind CSS

## Folder structure

```
.
├── .gitignore                 # blocks .env, node_modules, dist, build
├── package.json               # root orchestration scripts (no deps)
├── README.md
├── server/
│   ├── .env                   # SECRETS ONLY — git-ignored (copy from .env.example)
│   ├── .env.example
│   ├── package.json
│   ├── index.js               # entry: connect DB then start API
│   ├── src/
│   │   ├── app.js             # Express app (cors, json, routes, error handler)
│   │   ├── config/env.js      # reads all server-side secrets from .env
│   │   ├── db/connect.js      # Mongoose connect with loud success/failure logs
│   │   ├── middleware/auth.js # requireAuth + requireRole (reused by every later phase)
│   │   ├── models/            # User, Ticket, Message (+ internal Counter for ticket numbers)
│   │   ├── routes/            # health, auth
│   │   ├── scripts/seed.js    # creates the two demo accounts
│   │   └── utils/ticketNumber.js
│   └── test/phase1.test.js    # dev-only: end-to-end auth/schema checks on in-memory Mongo
└── client/
    ├── .env                   # ONLY non-secret VITE_API_URL — git-ignored
    ├── .env.example
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx            # health-check UI on load
        ├── index.css
        └── vite-env.d.ts
```

## First-time setup

1. Copy the env templates and fill in real values:

   ```bash
   # Terminal 1 (secrets — never committed, never read by /client)
   copy server\.env.example server\.env     # Windows
   #   -> edit server/.env: MONGO_URI, JWT_SECRET, GEMINI_API_KEY
   copy client\.env.example client\.env     # Windows
   ```

2. Install everything (from the repo root):

   ```bash
   npm --prefix server install
   npm --prefix client install
   # or the shortcut: npm run install:all
   ```

## Run locally (two terminals)

```bash
# Terminal 1 — API + Mongo connection logs
cd server
npm run dev

# Terminal 2 — Vite dev server
cd client
npm run dev
```

Open http://localhost:5173 — the page calls `GET /api/health` (`http://localhost:5000/api/health`) on load and shows green **Connected** (or a red failure message).

## Demo accounts (Phase 1 — for the live demo; created via `cd server && npm run seed`)

| Role     | Email                     | Password                 |
|----------|---------------------------|--------------------------|
| agent    | agent@supportflow.demo    | SupportFlowAgent!1       |
| customer | customer@supportflow.demo | SupportFlowCustomer!1    |

## Ticket workflow (Phase 2)

Backend (`/api/tickets`, all `requireAuth`):

| Endpoint | Who | Rules |
|---|---|---|
| `POST /api/tickets` | customer | `{ subject, description, category? }` — category optional; `customerId` always from token; status starts `"New"`; ticketNumber auto-generated |
| `GET /api/tickets/mine` | customer | Only the caller's own tickets |
| `GET /api/tickets/:id` | any | customer: own tickets only; agent: assigned to them OR unassigned in `"New"`; else 403 |
| `PATCH /api/tickets/:id/status` | assigned agent | Strict one-step machine `New -> Assigned -> In Progress -> Resolved` (no skipping); `Resolved` requires non-empty `resolutionNote`; Resolved tickets frozen here (409 → use `/reopen`) |
| `POST /api/tickets/:id/reopen` | assigned agent | Only way to change a Resolved ticket → back to `"In Progress"`, note cleared |

`New -> Assigned` is the claim step: the acting agent becomes `assignedAgentId` (any agent may claim an unassigned ticket).

Frontend: `/login`, `/tickets` (list + New Ticket form), `/tickets/:id` (detail). Every network call has visible loading, success, and specific error states. New dependency: `react-router-dom` (list/detail/login routing).

## Auth API (curl examples)

```bash
# 1) Register (role must be exactly "customer" or "agent")
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Agent","email":"agent@supportflow.demo","password":"SupportFlowAgent!1","role":"agent"}'

# 2) Login -> returns { token, user }
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@supportflow.demo","password":"SupportFlowAgent!1"}'

# 3) Call a protected route with the returned token
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>"
```

Phase 1 verification (dev-only, spins up an in-memory MongoDB — no real DB needed):

```bash
cd server
npm run test:phase1
```

## Secrets rule (applies to every phase)

`MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY` exist **only** in `/server/.env`. The client bundle may only ever contain non-secret `VITE_*` values.

## Deploy targets

- **Backend** → Render (build: install + `npm run start` in `/server`) using Render's env vars.
- **Frontend** → Vercel (build: `npm run build` in `/client`; set `VITE_API_URL` to the deployed Render URL).