#!/usr/bin/env sh
# Démarre Next en dev : install pnpm à la racine monorepo puis build des packages workspace.
set -eu
cd /app

RBAC_PKG="/app/packages/rbac-permissions"

if [ ! -f "$RBAC_PKG/package.json" ]; then
  echo "[web-dev] ERREUR: $RBAC_PKG/package.json introuvable." >&2
  echo "[web-dev] Vérifiez les volumes docker-compose (packages/rbac-permissions + manifests racine)." >&2
  exit 1
fi

echo "[web-dev] pnpm install (workspace depuis manifests montés)..."
_ws_count="$(find /app/apps /app/packages -maxdepth 2 -name package.json 2>/dev/null | wc -l | tr -d ' ')"
echo "[web-dev] manifests workspace détectés: ${_ws_count} (attendu 6 avec rbac-permissions)"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile

echo "[web-dev] build packages workspace..."
pnpm --filter @starium-orchestra/types run build
pnpm --filter @starium-orchestra/rbac-permissions run build
pnpm --filter @starium-orchestra/budget-exercise-calendar run build

cd /app/apps/web
echo "[web-dev] next dev sur :3000 (proxy API → \${INTERNAL_API_URL:-http://api-dev:3001})"
exec pnpm exec next dev -p 3000
