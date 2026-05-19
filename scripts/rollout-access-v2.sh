#!/usr/bin/env sh
# Wrapper rollout ACL V2 — local ou conteneur api-dev (docker-compose.dev.yml).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.dev.yml"
RUN="pnpm --filter @starium-orchestra/api exec ts-node --transpile-only scripts/rollout-access-v2.ts"

if [ $# -eq 0 ]; then
  set -- --help
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  cat <<'EOF'
Usage : ./scripts/rollout-access-v2.sh [options]

  --list-clients
  --client-id <uuid> | --client-name <nom>
  --module projects|budgets|contracts|suppliers|strategic_vision|all
  --dry-run          (défaut)
  --apply

Exemples :
  ./scripts/rollout-access-v2.sh --list-clients
  ./scripts/rollout-access-v2.sh --client-name "BatiPro Groupe" --module projects --dry-run
  ./scripts/rollout-access-v2.sh --client-id <ID> --module all --apply

Voir apps/api/scripts/rollout-access-v2.ts pour toutes les options.
EOF
  exit 0
fi

if docker compose -f "$COMPOSE_FILE" ps api-dev 2>/dev/null | grep -q 'Up'; then
  exec docker compose -f "$COMPOSE_FILE" exec -T api-dev sh -c \
    "cd /app/apps/api && pnpm exec ts-node --transpile-only scripts/rollout-access-v2.ts $(printf '%q ' "$@")"
fi

cd "$ROOT"
exec pnpm --filter @starium-orchestra/api exec ts-node --transpile-only scripts/rollout-access-v2.ts "$@"
