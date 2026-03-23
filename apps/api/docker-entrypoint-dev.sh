#!/usr/bin/env sh
# Démarre l’API en dev : migrations Prisma puis Nest en watch.
# Toujours exécuter depuis apps/api (schéma prisma/schema.prisma).
#
# pnpm install à la racine : sans ça, après ajout de deps ou changement de schéma,
# le node_modules de l’image Docker reste obsolète (pas de volume sur node_modules).
set -eu
cd /app
echo "[api-dev] pnpm install (sync workspace deps)..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
cd /app/apps/api
echo "[api-dev] prisma migrate deploy..."
pnpm exec prisma migrate deploy
echo "[api-dev] prisma generate..."
pnpm exec prisma generate
echo "[api-dev] prisma db seed..."
pnpm exec prisma db seed
echo "[api-dev] nest start --watch"
exec pnpm run start:dev
