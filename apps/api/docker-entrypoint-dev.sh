#!/usr/bin/env sh
# Démarre l’API en dev : migrations Prisma puis Nest en watch.
#
# Prisma : utiliser `pnpm --filter @starium-orchestra/api exec` depuis la racine
# monorepo (comme le Dockerfile) pour que `prisma generate` écrive le client au
# même endroit que la résolution pnpm (évite un @prisma/client obsolète vs schema.prisma monté).
#
# pnpm install à la racine : sans ça, après ajout de deps ou changement de schéma,
# le node_modules de l’image Docker reste obsolète (pas de volume sur node_modules).
set -eu
cd /app

# BullMQ (RFC-038) : en conteneur, 127.0.0.1 = le conteneur ; le hostname « redis » peut
# rester introuvable (Docker Desktop / réseaux). docker-compose.dev.yml utilise
# host.docker.internal + port 6379 publié par le service redis.
case "${DATABASE_URL:-}" in
  *"@postgres:"*)
    case "${REDIS_HOST:-}" in
      '' | 127.0.0.1 | localhost | redis)
        export REDIS_HOST=host.docker.internal
        export REDIS_PORT="${REDIS_PORT:-6379}"
        echo "[api-dev] REDIS_HOST -> host.docker.internal:${REDIS_PORT:-6379} (Redis via port hôte)"
        ;;
    esac
    ;;
esac

# Attente TCP : host.docker.internal = port 6379 exposé par le service redis du compose.
wait_for_redis() {
  case "${DATABASE_URL:-}" in *"@postgres:"*) ;; *) return 0 ;; esac
  _rh="${REDIS_HOST:-host.docker.internal}"
  _rp="${REDIS_PORT:-6379}"
  export _R_WAIT_HOST="$_rh"
  export _R_WAIT_PORT="$_rp"
  echo "[api-dev] attente TCP Redis ${_R_WAIT_HOST}:${_R_WAIT_PORT}..."
  _i=0
  while [ "$_i" -lt 90 ]; do
    if node -e "
const n=require('net');
const h=process.env._R_WAIT_HOST,p=Number(process.env._R_WAIT_PORT||6379);
const s=n.createConnection({host:h,port:p},()=>{s.end();process.exit(0)});
s.on('error',()=>process.exit(1));
setTimeout(()=>process.exit(1),800);
" 2>/dev/null; then
      echo "[api-dev] Redis joignable."
      unset _R_WAIT_HOST _R_WAIT_PORT
      return 0
    fi
    _i=$((_i + 1))
    if [ "$((_i % 15))" -eq 0 ]; then
      echo "[api-dev] Redis toujours absent après ${_i}s — démarre le service « redis » (port 6379 publié sur l’hôte)."
    fi
    sleep 1
  done
  unset _R_WAIT_HOST _R_WAIT_PORT
  echo "[api-dev] ERREUR: Redis injoignable (${_rh}:${_rp})." >&2
  echo "[api-dev] → docker compose -f docker-compose.dev.yml up -d redis api-dev" >&2
  echo "[api-dev] → Vérifie que le port 6379 est bien publié (redis:6379:6379) et qu’aucun autre process n’occupe 6379 sur l’hôte." >&2
  exit 1
}

wait_for_redis

SCHEMA="/app/apps/api/prisma/schema.prisma"

api_prisma_generate() {
  echo "[api-dev] purge .prisma (évite un client Prisma figé dans le store pnpm)..."
  rm -rf /app/apps/api/node_modules/.prisma 2>/dev/null || true
  for d in /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma; do
    if [ -d "$d" ]; then
      echo "[api-dev] rm $d"
      rm -rf "$d"
    fi
  done
  echo "[api-dev] prisma generate..."
  pnpm --filter @starium-orchestra/api exec prisma generate --schema="$SCHEMA"
}

assert_schema_has_bucket_fields() {
  if ! grep -q 'documentsBucketName' "$SCHEMA"; then
    echo "[api-dev] ERREUR: $SCHEMA ne contient pas documentsBucketName (volume prisma / branche locale ?)."
    exit 1
  fi
}

assert_generated_client_has_bucket_fields() {
  found=0
  for d in /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client; do
    if [ -d "$d" ] && grep -rq 'documentsBucketName' "$d" 2>/dev/null; then
      found=1
      break
    fi
  done
  if [ "$found" != 1 ]; then
    echo "[api-dev] ERREUR: client Prisma généré sans documentsBucketName (store .prisma introuvable ou obsolète)."
    exit 1
  fi
  echo "[api-dev] client Prisma OK (documentsBucketName présent sous .prisma/client)"
}

echo "[api-dev] pnpm install (sync workspace deps)..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
assert_schema_has_bucket_fields
echo "[api-dev] prisma migrate deploy..."
pnpm --filter @starium-orchestra/api exec prisma migrate deploy --schema="$SCHEMA"
api_prisma_generate
assert_generated_client_has_bucket_fields
echo "[api-dev] prisma db seed..."
pnpm --filter @starium-orchestra/api exec prisma db seed
echo "[api-dev] build workspace @starium-orchestra/budget-exercise-calendar..."
pnpm --filter @starium-orchestra/budget-exercise-calendar build
cd /app/apps/api
# dist/ persiste dans le conteneur entre restarts : sans ça, Nest peut servir un vieux
# projects.service.js (ex. ownerFreeLabel dans project.create) alors que src/ est à jour.
echo "[api-dev] rm -rf dist (rebuild propre depuis src monté)..."
rm -rf dist
# Watch seul peut laisser un bundle partiellement obsolète ; build complet aligne dist sur src/.
echo "[api-dev] nest build (compilation complète avant watch)..."
pnpm exec nest build
# Dernier generate avant chargement de @prisma/client par Nest (évite tout drift
# si le schéma monté a changé depuis le premier generate, ou caches partiels).
api_prisma_generate
assert_generated_client_has_bucket_fields
echo "[api-dev] nest start --watch"
exec pnpm run start:dev
