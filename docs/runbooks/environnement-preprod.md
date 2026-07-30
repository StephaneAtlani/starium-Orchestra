# Mode opératoire — Environnement de préproduction

La **préprod** est l'environnement de validation d'une release **avant** production : même code, même schéma, **données issues de la production** (anonymisées). C'est le dernier filet avant `main`.

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
feature/xxx ──PR──▶ preprod ──(validation préprod)──▶ PR ──▶ main ──▶ production
```

- Un hotfix urgent part de `main`, est mergé sur `main`, puis **rebasé/mergé dans `preprod`** pour éviter la divergence.
- Après chaque release, resynchroniser : `git checkout preprod && git merge --ff-only main` (ou merge simple si `preprod` a de l'avance).

---

## 2. Environnement d'exécution

Même stack que la prod (`docker-compose.yml`, profil `standard`) mais **secrets et services distincts** :

| Variable | Exigence préprod |
|---|---|
| `DATABASE_URL` | Base préprod dédiée — **jamais** l'instance de prod |
| `JWT_SECRET` | Valeur **différente** de la prod (un token prod ne doit pas être valide en préprod) |
| `MFA_ENCRYPTION_KEY` | Clé propre à la préprod (les secrets TOTP de prod sont purgés au refresh) |
| `SMTP_*` | **Sandbox / capture** (Mailpit, Brevo sandbox…) — jamais le relais de prod |
| `APP_PUBLIC_URL`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` | URLs préprod (figées au `docker build` pour le web) |
| `NODE_ENV` | `production` (comportement identique à la prod : fail-fast SMTP, logs) |
| `EMAIL_DELIVERIES_INLINE` | Vide → file BullMQ, comme en prod |

**Garde-fou e-mails** : le refresh vide `EmailDelivery` et remplace les adresses par `@preprod.invalid` (domaine réservé, non routable). Un envoi accidentel ne peut donc pas atteindre un vrai destinataire — à condition de ne pas utiliser `--keep-personal-data`.

---

## 3. Rafraîchissement de la base depuis la production

Script : [`scripts/preprod-db-refresh.sh`](../../scripts/preprod-db-refresh.sh) · anonymisation : [`scripts/preprod-anonymize.sql`](../../scripts/preprod-anonymize.sql)

```bash
export PROD_DATABASE_URL="postgresql://…@prod-host:5432/starium"      # compte en lecture
export PREPROD_DATABASE_URL="postgresql://…@preprod-host:5432/starium" # SERA ÉCRASÉE
export PREPROD_KEEP_EMAILS="admin@starium.xyz"                        # comptes de test conservés
export PREPROD_PASSWORD_HASH="$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" 'MotDePassePreprod!')"

./scripts/preprod-db-refresh.sh
```

Étapes exécutées :

1. `pg_dump` de la prod (format custom, sans owner/ACL).
2. `DROP SCHEMA public` + `pg_restore` sur la préprod.
3. `prisma migrate deploy` **sur les données de prod** — c'est ici qu'on détecte les migrations lentes ou destructives avant la vraie fenêtre de prod. Puis `migrate status`.
4. Anonymisation des DCP (transaction unique, contrôle final bloquant s'il reste une adresse réelle).

Options : `--yes` (non interactif, pour un job planifié), `--dump-file <f>` (rejouer un dump déjà pris), `--keep-personal-data` (**exceptionnel**, voir §4).

Après le refresh :

- supprimer le dump (`.tmp/preprod-refresh/`, gitignoré, contient des données de prod en clair) ;
- redéployer les images préprod puis dérouler le smoke test §5 ;
- se reconnecter : tous les `RefreshToken`, MFA et appareils de confiance sont purgés.

### Ce que l'anonymisation modifie

| Domaine | Traitement |
|---|---|
| `User` | e-mail → `user.<hash>@preprod.invalid`, nom/prénom neutralisés, champs profil vidés, `passwordHash` remplacé |
| `UserEmailIdentity`, `EmailAddressRegistry`, `DirectoryEmailIdentityLink` | adresses dérivées de façon **cohérente** (jointures et unicités préservées) |
| `UserMfa`, `MfaChallenge`, `TrustedDevice`, `RefreshToken`, `EmailIdentityVerificationToken` | purgés (chiffrés avec les clés de prod → inutilisables) |
| `MicrosoftConnection` | jetons OAuth chiffrés mis à `NULL` (reconnexion nécessaire en préprod) |
| `EmailDelivery` | purgée |
| `Collaborator`, `Resource`, `Supplier`, `SupplierContact` | identité, e-mail et téléphone neutralisés |
| `AuditLog`, `AuditLogArchive`, `PlatformAuditLog`, `SecurityLog` | `ipAddress`, `userAgent`, `email` mis à `NULL` |

**Conservé volontairement** : `clientId`, volumétrie, budgets, projets, contrats, structure des droits — indispensables pour tester le comportement réel et l'isolation multi-client.

---

## 4. Cadre RGPD

Le rafraîchissement est un **transfert de données de production vers un environnement de test** : la finalité (valider une release) ne justifie pas de conserver des données identifiantes.

- **Par défaut, anonymiser.** `--keep-personal-data` n'est acceptable que pour reproduire un incident précis, avec : accord explicite, accès préprod restreint aux personnes déjà habilitées en prod, SMTP sandbox vérifié, et **purge de la base sous 72 h**.
- Dumps intermédiaires : chiffrés ou supprimés immédiatement après usage, jamais dans le repo (`.gitignore` couvre `.tmp/` et `*.dump`).
- Aucune DCP dans les logs préprod, même règle qu'en prod.
- La préprod n'est **pas** un environnement de démonstration client : pour une démo, utiliser les seeds (`apps/api/prisma/seed*.ts`).

---

## 5. Validation avant merge vers `main`

| Contrôle | Attendu |
|---|---|
| CI sur `preprod` | Verte (lint, typecheck, build, migrate deploy) |
| `prisma migrate status` | « Database schema is up to date » après refresh |
| Durée des migrations | Mesurée sur volume prod, compatible avec la fenêtre de prod |
| Login + client actif | Connexion OK, sélection du client (`X-Client-Id`) OK |
| Isolation multi-client | Une ressource d'un autre client reste inaccessible (403) |
| Parcours métier de la release | Dérouler le scénario visé par les changements |
| Worker e-mails | Logs `[EMAIL worker]` sans erreur, envoi capté par le SMTP sandbox |
| Régression UI | Écrans touchés vérifiés dès 320px, états loading/empty/error |

Puis PR `preprod` → `main` et [passage-en-production.md](./passage-en-production.md).

---

## 6. Références

| Document | Sujet |
|---|---|
| [passage-en-production.md](./passage-en-production.md) | Déploiement release (ordre, migrations, rollback) |
| [migration-org-scope-access.md](./migration-org-scope-access.md) | Rollout flags org/ACL par client |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Structure repo, multi-client |
| [../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md](../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md) | Recovery migrations Prisma |
| [../../.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Pipeline CI (`main`, `preprod`, `develop`) |
