# Production setup: domain, TLS, and full checklist

This document ties together **DNS**, **HTTPS**, **Auth0**, **Docker Compose**, and **secrets** so **Zorvexa** is safe to run on the public internet. The product domain is **`zorvexa-ai.com`** (see `BRAND_PRIMARY_DOMAIN` in `src/shared/branding.ts`).

---

## 1. Choose your hostnames

Typical layout (replace with your real domain):

| Role | Example | Points to |
|------|---------|-----------|
| **App (UI + `/api` via nginx)** | `https://zorvexa-ai.com` or `https://app.zorvexa-ai.com` | Your server or load balancer |
| **API direct** (optional; avoid exposing in prod) | `https://api.zorvexa-ai.com` | Only if you split UI and API |

**Recommended:** One hostname for the SPA container on **port 3000** (Compose maps `3000:80`). The UI calls **`/api`** on the **same origin**; nginx proxies to the backend. You do **not** need a separate public API URL unless you intentionally split front and back.

---

## 2. DNS

At your registrar or DNS host (Cloudflare, Route53, etc.):

1. Create an **A** record (VM) or **CNAME** (load balancer / PaaS):
   - **Name:** `app` (or `@` if using apex with ALIAS/ANAME)
   - **Value:** server IPv4, LB hostname, or tunnel target
2. If you use **api.** separately, add that record too.
3. Wait for propagation (often minutes; TTL dependent).

**Cloudflare:** You can proxy (“orange cloud”) for DDoS/WAF; ensure **SSL mode** is **Full (strict)** when origin uses a valid cert, or **Full** with origin self-signed (not ideal).

---

## 3. TLS (HTTPS)

Browsers and Auth0 require **HTTPS** in production.

### Option A — Caddy on the host (simple VM)

1. Install [Caddy](https://caddyserver.com/docs/install).
2. Copy `deploy/Caddyfile.example` → `/etc/caddy/Caddyfile` and replace `app.example.com` with **`zorvexa-ai.com`** (or **`app.zorvexa-ai.com`** if you use a subdomain).
3. Point DNS at this machine; open **80** and **443** in the firewall.
4. Caddy obtains **Let’s Encrypt** certificates automatically.
5. Bind Docker ports to **loopback** so Postgres/Redis/API are not on the public interface:

   ```bash
   npm run docker:up:bind
   ```

   (Uses `deploy/docker-compose.bind-local.example.yml`.) Then Caddy `reverse_proxy 127.0.0.1:3000` matches the example file.

### Option B — Managed load balancer (AWS ALB, GCP LB, Fly, Railway, etc.)

- Terminate TLS at the LB.
- Forward HTTP to the instance port **3000** (or container port 80).
- Set **health check** to `GET /health` on the UI target (nginx stub) or use `/api/...` if you only expose API.

### Option C — Kubernetes Ingress

- Use **cert-manager** + **Ingress** with your ingress controller; route to the **frontend** Service (port 80).

---

## 4. Auth0 (production application)

In **Auth0 Dashboard → Applications → [Your SPA]**:

Add **exact** URLs (scheme + host + port, **no trailing slash** unless you use one everywhere):

| Setting | Example |
|---------|---------|
| **Allowed Callback URLs** | `https://zorvexa-ai.com` (and `https://www.zorvexa-ai.com` / `https://app.zorvexa-ai.com` if you use them) |
| **Allowed Logout URLs** | Same as callback |
| **Allowed Web Origins** | Same as callback |

Also keep **local** URLs if developers still use them, comma-separated:

`http://localhost:3000,http://localhost:5173,https://zorvexa-ai.com,https://www.zorvexa-ai.com`

**API audience:** If you use `VITE_AUTH0_AUDIENCE`, create/authorize the API and set backend **`AUTH_AUDIENCE`** to the same identifier (see `docs/auth0-application-checklist.md`).

---

## 5. Root `.env` for `docker compose` (production)

```bash
cp deploy/production.env.example .env
# Edit every value; never commit .env
```

Critical production values:

| Variable | Value |
|----------|--------|
| `POSTGRES_PASSWORD` | Strong random |
| `JWT_SECRET` | 32+ random bytes (openssl rand -hex 32) |
| `AUTH_DEV_BYPASS` | **`false`** |
| `AUTH_PROVIDER` | `auth0` when validating Auth0 access tokens |
| `AUTH_ISSUER` | `https://YOUR_TENANT.us.auth0.com/` (trailing slash as issued) |
| `AUTH_AUDIENCE` | Same as API identifier, e.g. `https://zorvexa-api` |
| `CORS_ORIGINS` | **Only** origins where your SPA is served (e.g. `https://zorvexa-ai.com`, `https://www.zorvexa-ai.com`, plus any admin origins you need) |
| `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` | Your SPA Auth0 app |
| `VITE_AUTH0_REDIRECT_URI` | Usually **omit** — the app uses `window.location.origin`. Set only if your public URL differs from the browser origin. |

After changing **`VITE_*`**, rebuild:

```bash
docker compose build frontend --no-cache
docker compose up -d
```

---

## 6. Do not expose the database or Redis publicly

In production:

- **Remove** or **firewall** host ports **5432** and **6379** on `docker-compose.yml` if the host is on the public internet, or bind them to **`127.0.0.1`** only.
- Prefer a **managed** Postgres (RDS, Cloud SQL, Neon) and set **`DATABASE_URL`** accordingly; omit the `postgres` service for that deployment pattern.

---

## 7. Final checklist

- [ ] DNS **A/CNAME** points to the right target  
- [ ] **HTTPS** works (padlock, valid cert)  
- [ ] Auth0 **Callback / Logout / Web Origins** include **`https://your-app-domain`**  
- [ ] **`AUTH_DEV_BYPASS=false`**  
- [ ] **`JWT_SECRET`** and **`POSTGRES_PASSWORD`** are strong and unique  
- [ ] **`CORS_ORIGINS`** lists only trusted UI origins  
- [ ] **`AUTH_ISSUER` / `AUTH_AUDIENCE`** match Auth0 tokens if using Auth0 on the API  
- [ ] **`docker compose up --build -d`** (or **`npm run docker:up:prod`** to avoid exposing DB/Redis/API ports) and **`/health`** + **`/ready`** succeed  
- [ ] **`TRUST_PROXY=true`** in `.env` when the API is behind nginx/Caddy (default in root `docker-compose.yml` for the backend service)  
- [ ] Logs monitored (`docker compose logs -f` or your log stack)  
- [ ] Backups for Postgres (snapshots or `pg_dump` schedule)  

---

## 8. Related docs

- [SELF_HOST_ZORVEXA_AI.md](./SELF_HOST_ZORVEXA_AI.md) — **zorvexa-ai.com**: Docker + Caddy quick path (`npm run self-host:up`)  
- [RUN_PRODUCTION.md](./RUN_PRODUCTION.md) — start the stack locally with Docker  
- [auth0-application-checklist.md](./auth0-application-checklist.md) — Auth0 URL and API details  
