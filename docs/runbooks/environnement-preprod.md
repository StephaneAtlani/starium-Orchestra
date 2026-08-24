# Mode opératoire — Environnement de préproduction

La **préprod** est l'environnement de validation d'une release **avant** production : même code, même schéma, **données issues de la production** (DCP conservées). Des **clients peuvent s'y connecter** pour tester (UAT) avec leurs identifiants habituels. C'est le dernier filet avant `main`.

**Branche Git** : `preprod`
**Passage en prod** : [passage-en-production.md](./passage-en-production.md)
**Gate go/no-go** : `.claude/skills/starium-release-gate/SKILL.md`

---

## 1. Rôle de la branche `preprod`

| | |
|---|---|
| Origine | Créée depuis `main` |
| Contenu | Code candidat à la production, déjà revu, en attente de validation sur données réelles |
| CI | `.github/workflows/ci.yml` — déclenchée sur `push` et `pull_request` vers `preprod` (lint, typecheck, build, `prisma migrate deploy`) |
| Sortie | Merge `preprod` → `main` **uniquement** après validation fonctionnelle + CI verte |
| Interdits | Commit direct de code non revu, `push --force`, correctif appliqué en préprod sans être reporté sur la branche source |

### Flux nominal

```text
feature/xxx ──PR──▶ preprod ──(UAT clients + validation)──▶ PR ──▶ main ──▶ production
```

- Un hotfix urgent part de `main`, est mergé sur `main`, puis **rebasé/mergé dans `preprod`** pour éviter la divergence.
- Après chaque release, resynchroniser : `git checkout preprod && git merge --ff-only main` (ou merge simple si `preprod` a de l'avance).

---

## 2. Environnement d'exécution

Stack **prod-like + MailHog** — fichier autonome [`docker-compose.preprod.yml`](../../docker-compose.preprod.yml) (Dokploy ne passe qu’un seul `-f`) :

```bash
# Local
docker compose -f docker-compose.preprod.yml up -d --build

# Dokploy : Compose file = docker-compose.preprod.yml (déjà le cas)
```

| Variable | Exigence préprod |
|---|---|
| `DATABASE_URL` | Base préprod dédiée — **jamais** l'instance de prod |
| `JWT_SECRET` | Valeur **différente** de la prod (un token prod ne doit pas être valide en préprod) |
| `MFA_ENCRYPTION_KEY` | **Identique** à la prod si les clients ont le MFA activé (sinon TOTP inutilisable) |
| `SMTP_*` | **Forcés vers MailHog** par `docker-compose.preprod.yml` (écrase Brevo / `.env`) |
| `APP_PUBLIC_URL`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` | URLs préprod (figées au `docker build` pour le web) |
| `NODE_ENV` | `production` (comportement identique à la prod : fail-fast SMTP, logs) |
| `EMAIL_DELIVERIES_INLINE` | Vide → file BullMQ + `api-worker`, comme en prod |

**MailHog (sandbox SMTP obligatoire)** — fichier [`docker-compose.preprod.yml`](../../docker-compose.preprod.yml) :

| | |
|---|---|
| SMTP interne | `mailhog:1025` (câblé sur `api` + `api-worker`) |
| UI | http://127.0.0.1:8025 — lire les mails capturés (OTP MFA, invitations, etc.) |
| Auth | Aucune (`SMTP_USER` / `SMTP_PASS` vidés volontairement) |

Vérification au démarrage :

```bash
docker compose -f docker-compose.preprod.yml exec api sh -lc 'env | grep ^SMTP_'
# Attendu : SMTP_HOST=mailhog  SMTP_PORT=1025  (jamais Brevo)
```

**Connexion clients** : e-mail + mot de passe (et MFA) = ceux de la production. Après un refresh, les sessions sont invalidées → reconnexion obligatoire. Les e-mails générés pendant l'UAT n'atteignent **jamais** les boîtes réelles : les consulter dans MailHog.

---

## 3. Rafraîchissement de la base depuis la production

Script : [`scripts/preprod-db-refresh.sh`](../../scripts/preprod-db-refresh.sh)

```bash
export PROD_DATABASE_URL="postgresql://…@prod-host:5432/starium"      # compte en lecture
export PREPROD_DATABASE_URL="postgresql://…@preprod-host:5432/starium" # SERA ÉCRASÉE

./scripts/preprod-db-refresh.sh
```

Étapes exécutées :

1. `pg_dump` de la prod (format custom, sans owner/ACL).
2. `DROP SCHEMA public` + `pg_restore` sur la préprod.
3. `prisma migrate deploy` **sur les données de prod** — détecte migrations lentes / destructives avant la fenêtre de prod. Puis `migrate status`.
4. Durcissement léger ([`preprod-harden.sql`](../../scripts/preprod-harden.sql)) : purge `EmailDelivery`, `RefreshToken`, tokens de vérif e-mail, défis MFA en cours.
5. **Pas d'anonymisation** (défaut) — comptes et DCP inchangés pour l'UAT.

Options : `--yes` (non interactif), `--dump-file <f>` (rejouer un dump), `--anonymize` (opt-in, cas exceptionnel sans UAT clients).

Après le refresh :

- supprimer le dump (`.tmp/preprod-refresh/`, gitignoré) ;
- redéployer les images préprod ;
- prévenir les clients UAT de se reconnecter ;
- dérouler le smoke test §5.

### Anonymisation (opt-in, sans UAT)

Uniquement si aucun client ne doit se connecter :

```bash
./scripts/preprod-db-refresh.sh --anonymize
```

Voir [`scripts/preprod-anonymize.sql`](../../scripts/preprod-anonymize.sql). Incompatible avec l'UAT clients (mots de passe et e-mails détruits).

---

## 4. Cadre RGPD & accès

La préprod contient des **données personnelles de production**. Cadre minimal :

| Règle | Détail |
|---|---|
| Finalité | Validation de release + UAT clients uniquement |
| Accès | Restreint aux opérateurs + clients explicitement invités ; pas d'accès public large |
| SMTP | **MailHog uniquement** (`docker-compose.preprod.yml`) — aucun envoi vers des boîtes réelles |
| Dumps | Supprimés après usage, jamais dans le repo (`.gitignore` : `.tmp/`, `*.dump`) |
| Logs | Aucune DCP en clair (même règle qu'en prod) |
| Anonymisation | Disponible via `--anonymize` si un refresh sans UAT est nécessaire |

La préprod n'est **pas** un environnement de démonstration grand public : pour une démo hors UAT, utiliser les seeds (`apps/api/prisma/seed*.ts`).

---

## 5. Validation avant merge vers `main`

| Contrôle | Attendu |
|---|---|
| CI sur `preprod` | Verte (lint, typecheck, build, migrate deploy) |
| `prisma migrate status` | « Database schema is up to date » après refresh |
| Durée des migrations | Mesurée sur volume prod, compatible avec la fenêtre de prod |
| Login client UAT | Connexion OK (e-mail/MDP ± MFA), sélection du client (`X-Client-Id`) OK |
| Isolation multi-client | Une ressource d'un autre client reste inaccessible (403) |
| Parcours métier de la release | Dérouler le scénario visé (opérateur + client UAT) |
| Worker e-mails | Logs `[EMAIL worker]` OK ; **aucun** envoi hors sandbox |
| Régression UI | Écrans touchés vérifiés dès 320px, états loading/empty/error |

Puis PR `preprod` → `main` et [passage-en-production.md](./passage-en-production.md).

---

## 6. Références

| Document | Sujet |
|---|---|
| [../../docker-compose.preprod.yml](../../docker-compose.preprod.yml) | Override préprod : MailHog + SMTP forcé |
| [passage-en-production.md](./passage-en-production.md) | Déploiement release (ordre, migrations, rollback) |
| [migration-org-scope-access.md](./migration-org-scope-access.md) | Rollout flags org/ACL par client |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Structure repo, multi-client |
| [../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md](../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md) | Recovery migrations Prisma |
| [../../.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Pipeline CI (`main`, `preprod`, `develop`) |
