#!/usr/bin/env sh
# Next standalone (`server.js`) force NODE_ENV=production au démarrage.
# On fige l’intention Dokploy (NODE_ENV=preproduction) avant.
set -eu
if [ -z "${STARIUM_NODE_ENV:-}" ]; then
  STARIUM_NODE_ENV="${NODE_ENV:-production}"
fi
export STARIUM_NODE_ENV
exec node apps/web/.next/standalone/apps/web/server.js
