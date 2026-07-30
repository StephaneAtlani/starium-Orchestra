#!/usr/bin/env bash
# =============================================================================
# Starium Orchestra — Rafraîchissement de la base PRÉPROD depuis la PRODUCTION
#
#   1. pg_dump PROD (lecture seule)
#   2. reset du schéma PRÉPROD + pg_restore
#   3. prisma migrate deploy (valide les migrations de la branche `preprod`
#      sur un jeu de données réel — c'est l'objectif principal de la préprod)
#   4. durcissement léger (file e-mails + sessions) — toujours
#   5. anonymisation des DCP — OPT-IN uniquement (--anonymize)
#
# Par défaut : données personnelles CONSERVÉES (UAT clients sur la préprod).
# Les comptes prod restent utilisables (même e-mail / mot de passe / MFA si
# MFA_ENCRYPTION_KEY est identique à la prod).
#
# Variables requises :
#   PROD_DATABASE_URL      URL Postgres source (compte en lecture suffit)
#   PREPROD_DATABASE_URL   URL Postgres cible (SERA ÉCRASÉE)
#
# Variables optionnelles (uniquement avec --anonymize) :
#   PREPROD_KEEP_EMAILS    e-mails non anonymisés, séparés par des virgules
#   PREPROD_PASSWORD_HASH  hash bcrypt appliqué aux comptes anonymisés
#   DUMP_DIR               répertoire des dumps (défaut : ./.tmp/preprod-refresh)
#
# Options : --yes (pas de confirmation)
#           --anonymize (anonymise les DCP — désactive les comptes clients réels)
#           --dump-file <fichier> (réutilise un dump existant, saute l'étape 1)
#
# Exemple (UAT clients — défaut) :
#   PROD_DATABASE_URL=... PREPROD_DATABASE_URL=... \
#   ./scripts/preprod-db-refresh.sh
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANONYMIZE_SQL="$ROOT_DIR/scripts/preprod-anonymize.sql"
HARDEN_SQL="$ROOT_DIR/scripts/preprod-harden.sql"
DUMP_DIR="${DUMP_DIR:-$ROOT_DIR/.tmp/preprod-refresh}"

ASSUME_YES=0
ANONYMIZE=0
DUMP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) ASSUME_YES=1; shift ;;
    --anonymize) ANONYMIZE=1; shift ;;
    --keep-personal-data)
      # Compat : ancien flag = comportement par défaut désormais.
      ANONYMIZE=0
      shift
      ;;
    --dump-file) DUMP_FILE="${2:?--dump-file requiert un chemin}"; shift 2 ;;
    -h|--help) sed -n '2,35p' "$0"; exit 0 ;;
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
  if [[ "$ANONYMIZE" -eq 0 ]]; then
    echo "    Les DCP de production seront CONSERVÉES (connexion clients possible)."
    echo "    SMTP sandbox obligatoire — voir docs/runbooks/environnement-preprod.md"
  else
    echo "    Anonymisation activée (--anonymize) : les comptes clients ne pourront plus se connecter."
  fi
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
  --dbname="$PREPROD_DATABASE_URL" "$DUMP_FILE"

# --- 3. Migrations de la branche preprod -------------------------------------
step "prisma migrate deploy (schéma de la branche courante)"
DATABASE_URL="$PREPROD_DATABASE_URL" \
  pnpm --dir "$ROOT_DIR" --filter @starium-orchestra/api exec prisma migrate deploy
DATABASE_URL="$PREPROD_DATABASE_URL" \
  pnpm --dir "$ROOT_DIR" --filter @starium-orchestra/api exec prisma migrate status

# --- 4. Durcissement léger (toujours) ----------------------------------------
# Empêche le flush d'e-mails prod en attente et force une reconnexion
# (JWT_SECRET préprod ≠ prod → les refresh tokens prod sont de toute façon invalides).
step "Durcissement préprod (file e-mails + sessions)"
psql --set=ON_ERROR_STOP=on "$PREPROD_DATABASE_URL" -f "$HARDEN_SQL"

# --- 5. Anonymisation RGPD (opt-in) ------------------------------------------
if [[ "$ANONYMIZE" -eq 1 ]]; then
  step "Anonymisation des données personnelles (--anonymize)"
  psql --set=ON_ERROR_STOP=on "$PREPROD_DATABASE_URL" \
    -v keep_emails="${PREPROD_KEEP_EMAILS:-}" \
    -v password_hash="${PREPROD_PASSWORD_HASH:-!login-disabled-preprod}" \
    -f "$ANONYMIZE_SQL"
else
  echo
  echo "ℹ️  DCP conservées (défaut UAT). Les clients se connectent avec leurs identifiants prod."
  echo "    Prérequis : MFA_ENCRYPTION_KEY identique à la prod si MFA activé ;"
  echo "    SMTP_* en sandbox ; accès préprod restreint."
fi

step "Terminé — préprod rechargée depuis la production"
echo "  Dump conservé : $DUMP_FILE (à supprimer après usage)"
