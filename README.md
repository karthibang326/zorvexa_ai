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

### Frontend

```bash
npm install
npm run dev
```

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
