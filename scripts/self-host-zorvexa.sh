#!/usr/bin/env bash
# Start Zorvexa via Docker Compose for self-hosting on zorvexa-ai.com (TLS via Caddy on the host).
# Usage:
#   npm run self-host:up
#   SELF_HOST_BIND_LOCAL=1 npm run self-host:up   # loopback-only ports (same box as Caddy)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "[self-host] Missing .env in repo root."
  echo "           cp deploy/production.env.example .env  &&  edit secrets / CORS / VITE_*"
  exit 1
fi

if [[ "${SELF_HOST_BIND_LOCAL:-0}" == "1" ]]; then
  echo "[self-host] Starting stack (production + loopback bind — use Caddy → 127.0.0.1:3000)..."
  docker compose \
    -f docker-compose.yml \
    -f deploy/docker-compose.production.yml \
    -f deploy/docker-compose.bind-local.example.yml \
    up --build -d
else
  echo "[self-host] Starting stack (production overlay — UI on host :3000, DB/API not published)..."
  docker compose \
    -f docker-compose.yml \
    -f deploy/docker-compose.production.yml \
    up --build -d
fi

echo ""
echo "[self-host] Done."
echo "  • UI:     http://127.0.0.1:3000  (or http://YOUR_SERVER_IP:3000 if not using bind overlay)"
echo "  • Public: point zorvexa-ai.com → this host, install Caddy, see deploy/Caddyfile.zorvexa-ai.example"
echo "  • Guide:  docs/SELF_HOST_ZORVEXA_AI.md"
