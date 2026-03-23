#!/usr/bin/env sh
# Supprime le cache Next local (apps/web/.next).
# Utile si MODULE_NOT_FOUND, routes-manifest.json manquant, chunks corrompus.
# Le stack Docker « dev » (web-dev) n’existe plus : le dev se fait avec pnpm en local.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Suppression de apps/web/.next…"
rm -rf apps/web/.next
echo "OK. Relance pnpm --filter @starium-orchestra/web run dev (ou équivalent)."
