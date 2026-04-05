# Deploy helpers

- **`Caddyfile.example`** — automatic HTTPS (Let’s Encrypt) and reverse proxy to the Docker UI on `127.0.0.1:3000`. See [../docs/PRODUCTION_AND_DOMAIN.md](../docs/PRODUCTION_AND_DOMAIN.md).
- **`docker-compose.production.yml`** — compose overlay: only **port 3000** (UI) is published; Postgres, Redis, and the API stay on the Docker network. Use with **`npm run docker:up:prod`** from the repo root.
- **`docker-compose.bind-local.example.yml`** — bind published ports to **127.0.0.1** only (pair with Caddy on the host).
- **`production.env.example`** — copy to repository root **`.env`** for production-oriented `docker compose` variables (see file header).
