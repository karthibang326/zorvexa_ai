#!/bin/sh
set -eu
cd /app
# Apply migrations before serving (requires prisma in production dependencies).
./node_modules/.bin/prisma migrate deploy
exec node dist/server.js
