# Hosting the Zorvexa frontend

The UI is a **Vite SPA**. Production must satisfy three things: a successful **`npm run build`**, **client-side routes** that resolve to `index.html`, and a **reachable API** (same origin or explicit URL).

## 1. Build must succeed

```bash
npm ci
npm run build
```

Output is `dist/`. If the build fails, fix errors before deploying — static hosts will not run a broken bundle.

## 2. SPA fallback (avoid 404 on refresh)

| Platform | What to do |
|----------|------------|
| **Vercel** | `vercel.json` rewrites non-file routes to `/index.html` (see repo root). |
| **Netlify** | `public/_redirects` ships with the build. |
| **nginx** (Docker) | `try_files $uri $uri/ /index.html;` — see `docker/nginx/default.conf`. |
| **Cloudflare Pages** | Add a `_redirects` file or **SPA fallback** rule to `/index.html`. |

## 3. API base URL

`src/lib/api.ts` uses:

- **`/api`** (relative) when **`VITE_WORKFLOWS_API_URL`** is **unset** — correct only if the host **proxies** `/api` to your Fastify backend (Docker nginx does this).
- **`${VITE_WORKFLOWS_API_URL}/api`** when the var is set — use this for **split hosting** (e.g. UI on Vercel, API on Railway/Fly/your VM).

Set in the **build environment** (not only runtime), because Vite inlines env at build time:

```bash
# Example: API at https://api.example.com → browser calls https://api.example.com/api/...
VITE_WORKFLOWS_API_URL=https://api.example.com
```

## 4. CORS (split hosting)

If the UI and API are on **different origins**, the backend must allow the UI origin in **`CORS_ORIGINS`** (see `docker-compose.yml` / `docker.env.example`).

## 5. Auth0 / Supabase

- **Auth0:** set `VITE_AUTH0_*` and **Allowed Callback / Logout / Web Origins** to your **production URL** (scheme + host, no stray slashes).
- **Supabase:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the build env for hosted previews.

## 6. Static-only deploy (no backend)

The marketing site and docs will load, but **`/api/*` will fail** until you either deploy the API and set `VITE_WORKFLOWS_API_URL`, or put a reverse proxy in front of both.
