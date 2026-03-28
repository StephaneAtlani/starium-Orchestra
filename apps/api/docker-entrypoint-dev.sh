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
echo "[api-dev] pnpm install (sync workspace deps)..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "[api-dev] prisma migrate deploy..."
pnpm --filter @starium-orchestra/api exec prisma migrate deploy
echo "[api-dev] prisma generate..."
pnpm --filter @starium-orchestra/api exec prisma generate
echo "[api-dev] prisma db seed..."
pnpm --filter @starium-orchestra/api exec prisma db seed
cd /app/apps/api
# dist/ persiste dans le conteneur entre restarts : sans ça, Nest peut servir un vieux
# projects.service.js (ex. ownerFreeLabel dans project.create) alors que src/ est à jour.
echo "[api-dev] rm -rf dist (rebuild propre depuis src monté)..."
rm -rf dist
# Watch seul peut laisser un bundle partiellement obsolète ; build complet aligne dist sur src/.
echo "[api-dev] nest build (compilation complète avant watch)..."
pnpm exec nest build
echo "[api-dev] nest start --watch"
exec pnpm run start:dev
