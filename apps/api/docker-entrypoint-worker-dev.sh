#!/usr/bin/env sh
# Worker e-mail en dev Docker : même réseau que le service `redis` (comme prod avec hostname `redis`).
# L’API `api-dev` peut utiliser host.docker.internal ; ce conteneur utilise `redis:6379` sur le réseau compose.
set -eu
cd /app

export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"

wait_for_redis() {
  echo "[api-worker-dev] attente Redis ${REDIS_HOST}:${REDIS_PORT}..."
  _i=0
  while [ "$_i" -lt 90 ]; do
    if node -e "
const n=require('net');
const h=process.env.REDIS_HOST,p=Number(process.env.REDIS_PORT||6379);
const s=n.createConnection({host:h,port:p},()=>{s.end();process.exit(0)});
s.on('error',()=>process.exit(1));
setTimeout(()=>process.exit(1),800);
" 2>/dev/null; then
      echo "[api-worker-dev] Redis joignable."
      return 0
    fi
    _i=$((_i + 1))
    sleep 1
  done
  echo "[api-worker-dev] ERREUR: Redis injoignable (${REDIS_HOST}:${REDIS_PORT})." >&2
  exit 1
}

wait_for_redis

echo "[api-worker-dev] pnpm install (sync workspace)..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

SCHEMA="/app/apps/api/prisma/schema.prisma"
echo "[api-worker-dev] prisma generate..."
pnpm --filter @starium-orchestra/api exec prisma generate --schema="$SCHEMA"

cd /app/apps/api
echo "[api-worker-dev] nest start --watch (worker/main)"
exec pnpm run start:worker:dev
