# Run AstraOps (production-style stack)

This guide starts **PostgreSQL**, **Redis**, **API**, **worker**, and **nginx + static UI** with one command.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2  
- Ports **3000** (UI), **5002** (API, optional direct access), **5432**, **6379** available (or change mappings in `docker-compose.yml`).

## 1. Environment

```bash
cp docker.env.example .env
```

Edit `.env`:

| Variable | Production | Local smoke test |
|----------|------------|------------------|
| `JWT_SECRET` | Strong random (32+ chars) | Any non-default string |
| `AUTH_DEV_BYPASS` | **`false`** | Compose defaults to **`true`** if omitted (easy local UI); set **`false`** for production |
| `POSTGRES_PASSWORD` | Strong secret | Default `astraops` is fine locally |
| `AUTH_PROVIDER` / `AUTH_ISSUER` / `AUTH_AUDIENCE` | Set when using Auth0 tokens | Optional if bypass on |
| `VITE_AUTH0_*` | Set before `docker compose build` if the UI uses Auth0 | Optional |

## 2. Auth0 (when using Universal Login)

1. In the Auth0 SPA application, add **`http://localhost:3000`** (no trailing slash) to **Callback URLs**, **Logout URLs**, and **Allowed Web Origins** (and your production UI URL when deployed).
2. Set `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` in `.env`, then rebuild the frontend image.
3. Authorize your API for the app if you set `VITE_AUTH0_AUDIENCE` (see `docs/auth0-application-checklist.md`).

## 3. Start

From the **repository root**:

```bash
docker compose up --build -d
```

- **UI:** http://localhost:3000  
- **API (direct):** http://localhost:5002  
- Through the UI, `/api` is proxied by nginx to the backend.

The API container runs **`prisma migrate deploy`** on each start before listening.

## 4. Health

```bash
docker compose ps
curl -s http://localhost:5002/health
curl -s http://localhost:3000/health
```

Database readiness: `GET http://localhost:5002/ready`

## 5. Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

## 6. Stop

```bash
docker compose down
```

Data volumes (`postgres_data`, `redis_data`) persist until `docker compose down -v`.

## 7. NPM shortcuts (from repo root)

- `npm run docker:up` — build and start detached  
- `npm run docker:up:prod` — same stack, but **only port 3000** is published (Postgres, Redis, and API are **not** exposed on the host — use for internet-facing VMs; add TLS via Caddy/ALB in front)  
- `npm run docker:down` — stop stack  
- `npm run docker:logs` — follow all service logs  

Backend and worker load **`env_file: .env`**, so any variable from your root `.env` (for example `SIMULATION_MODE`, `AI_OPS_LOOP_START_ON_BOOT`, cloud flags) is passed into the containers. Compose `environment:` entries still override when both are set.

## 8. Deploying to a real host (domain + HTTPS)

See **[PRODUCTION_AND_DOMAIN.md](./PRODUCTION_AND_DOMAIN.md)** for DNS, TLS (Caddy example), Auth0 production URLs, secrets, and a full checklist.

Quick references:

- **Production env template:** `deploy/production.env.example` → copy to root `.env`
- **TLS reverse proxy example:** `deploy/Caddyfile.example`
- **Bind DB/API/UI to localhost only:** `deploy/docker-compose.bind-local.example.yml` (use with `-f` alongside `docker-compose.yml`)
