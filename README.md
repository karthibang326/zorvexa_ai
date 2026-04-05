# Zorvexa

Autonomous Cloud Intelligence — enterprise AI control plane.

## Product

- **Name**: Zorvexa
- **Tagline**: Autonomous Cloud Intelligence
- **Description**: AI-powered workflow orchestration, self-healing infrastructure, and multi-cloud control plane

## Tech Stack

- Frontend: React, TypeScript, Vite, Zustand
- Backend: Fastify, TypeScript, Prisma, BullMQ, Redis
- Data: PostgreSQL (primary), optional mock/memory fallback for development

## Core Modules

- Workflow orchestration (`/api/workflows`)
- Run execution + SSE (`/api/runs`)
- AI Copilot (`/api/ai`)
- Self-healing engine (`/api/self-healing`)
- Multi-cloud control plane (`/api/cloud`)
- FinOps engine (`/api/finops`)
- Infra generator (`/api/infra`)

## Quick Start

If your checkout has this app inside a nested folder (e.g. `zorvexa_ai/zorvexa_ai`), you can run **`npm install` and `npm run dev` from the parent directory** — a root `package.json` forwards commands into `zorvexa_ai/`. For Docker on a fresh machine, use **`npm run host:docker`** from that parent (creates `.env` with generated secrets, then starts Compose).

### Frontend

Sign-in uses **Supabase** only.

**Local (recommended):** start the local stack, then the UI (defaults are in **`.env.development`** — no need to paste keys):

```bash
npm install
npm run supabase:start   # Docker — wait until API is ready
npm run dev              # or: npm run dev:free
```

**Hosted Supabase:** set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** in `.env` or `.env.local` (see `.env.example`). Hosted values override `.env.development`.

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

## Full stack (Docker, production-style)

Runs Postgres, Redis, API (with migrations on boot), worker, and nginx + built UI.

```bash
cp docker.env.example .env   # edit JWT_SECRET and optional Auth0 vars
npm run docker:up            # or: docker compose up --build -d
```

- **App:** http://localhost:3000  
- **API:** http://localhost:5002 (browser calls `/api` via nginx on :3000)

Details: [docs/RUN_PRODUCTION.md](docs/RUN_PRODUCTION.md) · **Domain, HTTPS, Auth0 production:** [docs/PRODUCTION_AND_DOMAIN.md](docs/PRODUCTION_AND_DOMAIN.md) · **Vercel / Netlify / split API:** [docs/HOSTING.md](docs/HOSTING.md)

## Build & Test

### Frontend

```bash
npm run build
npm run test
```

### Backend

```bash
cd backend
npm run build
npm run test
```
