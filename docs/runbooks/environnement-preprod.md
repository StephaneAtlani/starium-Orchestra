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

**Migrations Prisma (P3009)** : le boot API préprod (`scripts/preprod-api-entrypoint.cjs`) marque **toutes** les migrations `failed` en `--rolled-back`, puis relance `migrate deploy`. Sur une base trop abîmée : wipe du volume postgres Dokploy puis redeploy.

Ne pas laisser `MFA_ENCRYPTION_KEY` vide en env Dokploy (crash boot).

| Réseau | Origine | Rôle |
|---|---|---|
| `starium-preprod-network` | Notre compose | Isolation interne préprod |
| `dokploy-network` | Injecté par Dokploy (domaines UI) | Traefik |

Le service `ensure-dokploy-network` crée `dokploy-network` au deploy s’il manque (via docker.sock). Alternative UI : **Advanced → Isolated Deployments = ON**.

Stack **prod-like + MailHog** — fichier autonome [`docker-compose.preprod.yml`](../../docker-compose.preprod.yml) (Dokploy ne passe qu’un seul `-f`) :

```bash
# Local
docker compose -f docker-compose.preprod.yml up -d --build

# Dokploy : Compose file = docker-compose.preprod.yml (déjà le cas)
```

| Variable | Exigence préprod |
|---|---|
| `DATABASE_URL` | Base préprod dédiée — **jamais** l'instance de prod |
| `JWT_SECRET` | **Identique** à la prod (MFA TOTP historique dérivé du JWT + UAT avec les mêmes sessions/secrets) |
| `MFA_ENCRYPTION_KEY` | **Identique** à la prod si les clients ont le MFA activé (sinon TOTP inutilisable) |
| `MFA_ENCRYPTION_KEY_V1` | Optionnel : si warn fallback JWT, poser `MFA_ENCRYPTION_KEY_V1` = `JWT_SECRET` (même valeur prod) |
| `SMTP_*` | **Forcés vers MailHog** par `docker-compose.preprod.yml` (écrase Brevo / `.env`) |
| `APP_PUBLIC_URL`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` | URLs préprod (figées au `docker build` pour le web) |
| `NODE_ENV` | **Dokploy Environment** : `preproduction` (service `web` uniquement — panneau login orange). API/worker : laisser `production` dans le compose (fail-fast SMTP). **Ne pas** poser `NODE_ENV=production` au build web avant `pnpm install`. |
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

## 3. Rafraîchir la préprod depuis la prod (Dokploy — procédure nominale)

**Objectif** : même data que la prod (y compris MFA TOTP) + mêmes secrets de chiffrement → le **même** code Authenticator marche en préprod.

### Inventaire Dokploy (VM actuelle)

| | Prod | Préprod |
|---|---|---|
| **Conteneur Postgres** | `starium-orchestra-starium-orchestra-2j3ybl-postgres-1` | `starium-orchestra-preproduction-prproduction-starium-uixs2l-postgres-1` |
| **Volume data** | `starium-orchestra-starium-orchestra-2j3ybl_postgres_data` | `starium-orchestra-preproduction-prproduction-starium-uixs2l_postgres_data` |
| **Compose (code)** | `/etc/dokploy/compose/starium-orchestra-starium-orchestra-2j3ybl/code` | `/etc/dokploy/compose/starium-orchestra-preproduction-prproduction-starium-uixs2l/code` |
| **API (repère)** | `…2j3ybl-api-1` | `…uixs2l-api-1` |

Vérifier le volume monté :

```bash
docker inspect starium-orchestra-starium-orchestra-2j3ybl-postgres-1 \
  --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'

docker inspect starium-orchestra-preproduction-prproduction-starium-uixs2l-postgres-1 \
  --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'
```

### 3.1 Secrets Dokploy (avant / après — sans ça le MFA casse)

Dans l’UI Environment **préprod**, coller **exactement** les valeurs **prod** (copier-coller, ne pas retaper) :

| Variable | Préprod = prod ? |
|---|---|
| `JWT_SECRET` | **Oui** |
| `MFA_ENCRYPTION_KEY` | **Oui** |
| `MFA_KEY_VERSION` | **Oui** (souvent `1`) |
| `AUTH_JWT_SECRET` / `NEST_JWT_SECRET` | Si SET en prod → **mêmes valeurs** ; sinon laisser **vides** des deux côtés |

Puis **recreate** `api` + `api-worker` préprod après tout changement d’env.

### 3.2 Restore du volume Postgres (Dokploy)

1. **Backup prod** à jour dans Dokploy (volume prod / Postgres-Prod).
2. Sur le serveur, **libérer** le volume préprod (sinon Dokploy abort *volume is in use*) :

```bash
cd /etc/dokploy/compose/starium-orchestra-preproduction-prproduction-starium-uixs2l/code

docker compose -f docker-compose.preprod.yml down

docker ps -a --filter volume=starium-orchestra-preproduction-prproduction-starium-uixs2l_postgres_data
# si un conteneur reste : docker rm -f <nom>

docker volume rm starium-orchestra-preproduction-prproduction-starium-uixs2l_postgres_data
```

3. **Dokploy** → restore volume :
   - **Backup** = fichier tar du volume **prod** (ex. `…2j3ybl_postgres_data-….tar`)
   - **Volume name (cible)** = `starium-orchestra-preproduction-prproduction-starium-uixs2l_postgres_data`  
     (pas le nom du volume prod)
4. Remonter la stack :

```bash
docker compose -f docker-compose.preprod.yml up -d
```

5. **Durcissement** (sessions / file mail — **ne touche pas** au MFA) :

```bash
docker exec -i starium-orchestra-preproduction-prproduction-starium-uixs2l-postgres-1 \
  psql -U starium -d starium < scripts/preprod-harden.sql
```

`preprod-harden.sql` purge seulement : `EmailDelivery`, `RefreshToken`, `EmailIdentityVerificationToken`, `MfaChallenge`.  
**Pas** de reset MFA. Le secret TOTP en base reste celui de la prod.

### 3.3 Contrôle « même MFA que la prod »

```bash
# Prod
docker exec -i starium-orchestra-starium-orchestra-2j3ybl-postgres-1 \
  psql -U starium -d starium <<'SQL'
SELECT md5(m."totpSecretEncrypted") AS enc_md5, m."totpEnabledAt",
       left(m."totpSecretEncrypted", 24) AS head
FROM "UserMfa" m
JOIN "User" u ON u.id = m."userId"
WHERE u.email = 'admin@starium.fr';
SQL

# Préprod
docker exec -i starium-orchestra-preproduction-prproduction-starium-uixs2l-postgres-1 \
  psql -U starium -d starium <<'SQL'
SELECT md5(m."totpSecretEncrypted") AS enc_md5, m."totpEnabledAt",
       left(m."totpSecretEncrypted", 24) AS head
FROM "UserMfa" m
JOIN "User" u ON u.id = m."userId"
WHERE u.email = 'admin@starium.fr';
SELECT count(*) AS refresh FROM "RefreshToken";
SELECT count(*) AS mail FROM "EmailDelivery";
SQL
```

| Attendu | |
|---|---|
| `enc_md5` / `totpEnabledAt` | **Identiques** prod ↔ préprod |
| `RefreshToken` / `EmailDelivery` préprod | **0** après harden |

Login [https://preprod.starium.fr/login](https://preprod.starium.fr/login) avec le **même** code Authenticator qu’en prod.

Si message *Secret MFA illisible* → les clés §3.1 ne matchent pas la matière qui a chiffré le blob (revoir coller JWT/MFA depuis prod + recreate api). **Ne pas** reset MFA si tu veux garder le même Authenticator.

### 3.4 Alternative sans Dokploy volume : script `pg_dump`

Script : [`scripts/preprod-db-refresh.sh`](../../scripts/preprod-db-refresh.sh)

```bash
export PROD_DATABASE_URL="postgresql://…@prod-host:5432/starium"      # lecture
export PREPROD_DATABASE_URL="postgresql://…@preprod-host:5432/starium" # ÉCRASÉE

./scripts/preprod-db-refresh.sh
```

Étapes : dump → restore → `prisma migrate deploy` → `preprod-harden.sql`.  
Mêmes exigences secrets §3.1. Options : `--yes`, `--dump-file`, `--anonymize` (casse l’UAT clients).

Après refresh : prévenir les UAT de se reconnecter ; smoke §5.

### Anonymisation (opt-in, sans UAT)

```bash
./scripts/preprod-db-refresh.sh --anonymize
```

Voir [`scripts/preprod-anonymize.sql`](../../scripts/preprod-anonymize.sql). Incompatible avec l’UAT (mots de passe / e-mails détruits).

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
