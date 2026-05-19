#!/usr/bin/env sh
# Migration accès V2 : un client (--client-name) ou tous (--all-clients).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WRAPPER="$ROOT/scripts/rollout-access-v2.sh"

for a in "$@"; do
  case "$a" in
    --list-clients|-h|--help)
      exec sh "$WRAPPER" "$@"
      ;;
  esac
done

all_clients=false
is_dry=false
has_client=false
for a in "$@"; do
  case "$a" in
    --all-clients) all_clients=true ;;
    --dry-run) is_dry=true ;;
    --client-id|--client-name) has_client=true ;;
  esac
done

if [ "$all_clients" = true ]; then
  if [ "$is_dry" = true ]; then
    exec sh "$WRAPPER" --all-clients --dry-run --module all --ensure-org-root "$@"
  fi
  exec sh "$WRAPPER" --all-clients --migrate "$@"
fi

if [ "$has_client" = true ]; then
  if [ "$is_dry" = true ]; then
    exec sh "$WRAPPER" --dry-run --module all --ensure-org-root "$@"
  fi
  exec sh "$WRAPPER" --migrate "$@"
fi

echo "Précisez --all-clients, ou --client-id / --client-name (voir --help)." >&2
exit 1
