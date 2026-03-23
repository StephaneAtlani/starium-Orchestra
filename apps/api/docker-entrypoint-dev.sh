#!/usr/bin/env sh
# Démarre l’API en dev : migrations Prisma puis Nest en watch.
# Toujours exécuter depuis apps/api (schéma prisma/schema.prisma).
set -eu
cd /app/apps/api
echo "[api-dev] prisma migrate deploy..."
pnpm exec prisma migrate deploy
echo "[api-dev] prisma generate..."
pnpm exec prisma generate
echo "[api-dev] prisma db seed..."
pnpm exec prisma db seed
echo "[api-dev] nest start --watch"
exec pnpm run start:dev
