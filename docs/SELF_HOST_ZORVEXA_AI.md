# Self-host Zorvexa on **zorvexa-ai.com**

This is the shortest path to run the full stack on **your** server. Cursor cannot access your registrar or VPS; you run these steps on the machine that will serve traffic.

## 1. DNS

At your DNS provider, point **`zorvexa-ai.com`** (and **`www`** if you use the Caddy example) to the server’s **public IPv4** (A record) or load balancer hostname (CNAME). Wait for propagation.

### GoDaddy shows “Launching Soon” (your screenshot)

That page is **not** your app — it means traffic still goes to **GoDaddy’s placeholder**, not your VPS.

1. **GoDaddy → My Products → zorvexa-ai.com → DNS** (or “Manage DNS”).
2. **Turn off** anything that keeps the domain on GoDaddy’s page: **Website / Website Builder** on this domain, **Forwarding**, or a **“Coming soon”** / parking product. Connect the domain to **DNS only** (or “I’ll host elsewhere”) if you see that option.
3. **DNS records** — for the **apex** (`@` or blank name):
   - **Type A**, **Name @**, **Value** = your VPS **public IPv4** (from your cloud panel: e.g. DigitalOcean / AWS / the machine where you run Docker).
   - Optional **www**: **Type A** or **CNAME** pointing to the same host (or CNAME `www` → `@` if your DNS allows it).
4. Remove or fix any **A** record that points to a **GoDaddy parking IP** (often looks like a shared hosting IP, not your server). Only **your** server’s IP should receive `@`.
5. Wait **5–60 minutes** (sometimes up to 48h), then try again in an incognito window.

Until **dig** / **nslookup** for `zorvexa-ai.com` returns **your** server IP, the host “not working” is expected — the app never gets the request.

## 2. Root `.env`

From the repo root:

```bash
cp deploy/production.env.example .env
```

Edit **every** `CHANGE_ME` and set at least:

- `POSTGRES_PASSWORD`, `JWT_SECRET`
- `AUTH_DEV_BYPASS=false`
- `CORS_ORIGINS` — exact browser origins, e.g. `https://zorvexa-ai.com` (add `https://www.zorvexa-ai.com` if you keep www)
- `VITE_*` for Auth0 / Supabase if you use them (rebuild frontend after changes)

## 3. Start Docker (production overlay)

**Default (UI on `0.0.0.0:3000`; put TLS in front with Caddy on the same host):**

```bash
npm run self-host:up
```

**Tighter (UI + DB + API only on loopback — use with Caddy on the same machine):**

```bash
npm run self-host:up:local
```

Then install Caddy and use `deploy/Caddyfile.zorvexa-ai.example` so HTTPS hits **127.0.0.1:3000**.

## 4. HTTPS with Caddy

```bash
sudo cp deploy/Caddyfile.zorvexa-ai.example /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Open **https://zorvexa-ai.com** — the SPA uses same-origin **`/api`** (nginx proxies to the backend inside Compose).

## 5. Checklist

- [ ] Firewall: allow **80** and **443** from the internet; avoid exposing **5432** / **6379** publicly (production overlay already hides them from the host).
- [ ] Auth0 / Supabase redirect URLs include **`https://zorvexa-ai.com`** (and www if used).
- [ ] `TRUST_PROXY=true` is set when behind Caddy (default in `docker-compose.yml` for the backend).

See also [PRODUCTION_AND_DOMAIN.md](./PRODUCTION_AND_DOMAIN.md) and [auth0-application-checklist.md](./auth0-application-checklist.md).
