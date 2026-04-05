#!/usr/bin/env bash
# Create zorvexa_ai/.env from docker.env.example with real secrets if missing.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  echo "[init-docker-env] .env already exists — leaving it unchanged."
  exit 0
fi

if [[ ! -f docker.env.example ]]; then
  echo "[init-docker-env] docker.env.example not found in $ROOT"
  exit 1
fi

cp docker.env.example .env
PW="$(openssl rand -hex 16)"
JWT="$(openssl rand -hex 32)"

if [[ "$(uname -s)" == "Darwin" ]]; then
  sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$PW/" .env
  sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$JWT/" .env
else
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$PW/" .env
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT/" .env
fi

echo "[init-docker-env] Created .env with generated POSTGRES_PASSWORD and JWT_SECRET."
echo "            For local demos without Auth0, set AUTH_DEV_BYPASS=true in .env (see docker.env.example comments)."
