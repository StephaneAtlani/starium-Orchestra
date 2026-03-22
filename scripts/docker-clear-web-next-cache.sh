#!/usr/bin/env sh
# Purge le volume Docker qui contient apps/web/.next (web-dev profile).
# À lancer si MODULE_NOT_FOUND sur vendor-chunks/@swc+helpers, *.js numérotés, ou routes-manifest.json manquant.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Arrêt de web-dev…"
docker compose --profile dev stop web-dev 2>/dev/null || true

echo "Recherche du volume *web_next_cache*…"
VOL="$(docker volume ls -q | grep -E 'web_next_cache$' | head -n 1 || true)"
if [ -z "$VOL" ]; then
  echo "Aucun volume web_next_cache trouvé (déjà supprimé ou autre nom)."
else
  echo "Suppression du volume: $VOL"
  docker volume rm "$VOL"
fi

echo "Redémarrage de web-dev (rebuild du cache Next au premier chargement)…"
docker compose --profile dev up -d web-dev

echo "OK. Attendre le démarrage de Next, puis recharger la page."
