#!/usr/bin/env bash
# =============================================================================
# Starium Orchestra — Rafraîchissement de la base PRÉPROD depuis la PRODUCTION
#
#   1. pg_dump PROD (lecture seule)
#   2. reset du schéma PRÉPROD + pg_restore
#   3. prisma migrate deploy (valide les migrations de la branche `preprod`
#      sur un jeu de données réel — c'est l'objectif principal de la préprod)
#   4. anonymisation des DCP (RGPD) — activée par défaut
#
# Variables requises :
#   PROD_DATABASE_URL      URL Postgres source (compte en lecture suffit)
#   PREPROD_DATABASE_URL   URL Postgres cible (SERA ÉCRASÉE)
#
# Variables optionnelles :
#   PREPROD_KEEP_EMAILS    e-mails non anonymisés, séparés par des virgules
#                          (comptes de test / admin plateforme)
#   PREPROD_PASSWORD_HASH  hash bcrypt appliqué aux comptes anonymisés
#                          (défaut : login désactivé)
#   DUMP_DIR               répertoire des dumps (défaut : ./.tmp/preprod-refresh)
#
# Options : --yes (pas de confirmation)  --keep-personal-data (saute l'anonymisation)
#           --dump-file <fichier> (réutilise un dump existant, saute l'étape 1)
#
# Exemple :
#   PROD_DATABASE_URL=... PREPROD_DATABASE_URL=... \
#   PREPROD_KEEP_EMAILS=admin@starium.xyz \
#   ./scripts/preprod-db-refresh.sh
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANONYMIZE_SQL="$ROOT_DIR/scripts/preprod-anonymize.sql"
DUMP_DIR="${DUMP_DIR:-$ROOT_DIR/.tmp/preprod-refresh}"

ASSUME_YES=0
ANONYMIZE=1
DUMP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) ASSUME_YES=1; shift ;;
    --keep-personal-data) ANONYMIZE=0; shift ;;
    --dump-file) DUMP_FILE="${2:?--dump-file requiert un chemin}"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

die() { echo "❌ $*" >&2; exit 1; }
step() { echo; echo "▸ $*"; }

command -v pg_dump >/dev/null || die "pg_dump introuvable (installer postgresql-client)"
command -v pg_restore >/dev/null || die "pg_restore introuvable"
command -v psql >/dev/null || die "psql introuvable"

: "${PREPROD_DATABASE_URL:?PREPROD_DATABASE_URL manquante}"
[[ -n "$DUMP_FILE" ]] || : "${PROD_DATABASE_URL:?PROD_DATABASE_URL manquante}"

if [[ -n "${PROD_DATABASE_URL:-}" && "$PROD_DATABASE_URL" == "$PREPROD_DATABASE_URL" ]]; then
  die "PROD_DATABASE_URL et PREPROD_DATABASE_URL sont identiques — abandon"
fi

# Empreinte lisible de la cible (sans identifiants) pour la confirmation.
target_label="$(printf '%s' "$PREPROD_DATABASE_URL" | sed -E 's#^[^/]*//[^@]*@#//#')"

if [[ "$ASSUME_YES" -ne 1 ]]; then
  echo "⚠️  Le schéma public de la base cible va être SUPPRIMÉ puis rechargé :"
  echo "    $target_label"
  read -r -p "    Confirmer en tapant PREPROD : " confirm
  [[ "$confirm" == "PREPROD" ]] || die "Confirmation invalide — abandon"
fi

mkdir -p "$DUMP_DIR"

# --- 1. Dump production -------------------------------------------------------
if [[ -z "$DUMP_FILE" ]]; then
  DUMP_FILE="$DUMP_DIR/prod-$(date +%Y%m%d-%H%M%S).dump"
  step "Dump production → $DUMP_FILE"
  pg_dump --format=custom --no-owner --no-privileges --no-acl \
    --file "$DUMP_FILE" "$PROD_DATABASE_URL"
else
  step "Réutilisation du dump $DUMP_FILE"
  [[ -f "$DUMP_FILE" ]] || die "Dump introuvable : $DUMP_FILE"
fi

# --- 2. Reset + restore préprod ----------------------------------------------
step "Reset du schéma public sur la préprod"
psql --set=ON_ERROR_STOP=on "$PREPROD_DATABASE_URL" \
  -c 'DROP SCHEMA IF EXISTS public CASCADE;' \
  -c 'CREATE SCHEMA public;'

step "Restauration du dump sur la préprod"
pg_restore --no-owner --no-privileges --no-acl --exit-on-error \
  --dbname "$PREPROD_DATABASE_URL" "$DUMP_FILE"

# --- 3. Migrations de la branche preprod -------------------------------------
step "prisma migrate deploy (schéma de la branche courante)"
DATABASE_URL="$PREPROD_DATABASE_URL" \
  pnpm --dir "$ROOT_DIR" --filter @starium-orchestra/api exec prisma migrate deploy
DATABASE_URL="$PREPROD_DATABASE_URL" \
  pnpm --dir "$ROOT_DIR" --filter @starium-orchestra/api exec prisma migrate status

# --- 4. Anonymisation RGPD ----------------------------------------------------
if [[ "$ANONYMIZE" -eq 1 ]]; then
  step "Anonymisation des données personnelles"
  psql --set=ON_ERROR_STOP=on "$PREPROD_DATABASE_URL" \
    -v keep_emails="${PREPROD_KEEP_EMAILS:-}" \
    -v password_hash="${PREPROD_PASSWORD_HASH:-!login-disabled-preprod}" \
    -f "$ANONYMIZE_SQL"
else
  echo
  echo "⚠️  Anonymisation DÉSACTIVÉE (--keep-personal-data)."
  echo "    La préprod contient des données personnelles réelles : accès restreint,"
  echo "    SMTP neutralisé et durée de conservation limitée obligatoires (RGPD)."
fi

step "Terminé — préprod rechargée depuis la production"
echo "  Dump conservé : $DUMP_FILE (à supprimer après usage)"
