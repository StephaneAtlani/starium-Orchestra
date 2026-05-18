# Mode opératoire — Passage en production

Procédure d’exploitation pour déployer une **release applicative** Starium Orchestra (API NestJS + Web Next.js standalone + worker e-mails) sur un environnement **self-hosted** (Docker Compose, Dokploy ou équivalent).

**Hors périmètre** : activation progressive des flags org/ACL par client → [migration-org-scope-access.md](./migration-org-scope-access.md) et [_Plan de déploiement Org & licences](../RFC/_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

---

## 1. Prérequis

| Élément | Exigence |
|--------|----------|
| Branche | Merge sur `main` (ou branche de release validée) après **CI verte** (lint, typecheck, build, `prisma migrate deploy` sur Postgres CI) |
| Accès | Snapshot / sauvegarde PostgreSQL **avant** toute migration |
| Fenêtre | Communication si migration destructive ou changement de droits visible |
| Node / pnpm | Même génération qu’en image : **Node 20**, **pnpm 9** (voir Dockerfiles) |

---

## 2. Checklist pré-release (local ou CI)

```bash
# À la racine du monorepo, sur le commit/tag à déployer
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm predeploy:api          # build API + tests Jest module e-mail
pnpm test                   # suite complète si la fenêtre le permet
```

**Web (patch sécurité ou release front)** — vérifier la version résolue :

```bash
pnpm why next -r --filter @starium-orchestra/web
# Attendu : next >= 15.5.16 (ex. CVE-2026-44578, SSRF WebSocket self-hosted)
```

**Audit dépendances** (recommandé) :

```bash
pnpm audit --audit-level high
```

**SMTP** (optionnel mais conseillé avant prod) :

```bash
pnpm --filter @starium-orchestra/api verify:smtp -- --strict
```

---

## 3. Variables d’environnement (rappel critique)

Déclarer dans le PaaS / `.env` **sans laisser de clés vides** qui écrasent `env_file` (voir `docker-compose.yml`, commentaires `x-api-base-env`).

| Variable | Service | Obligatoire prod |
|----------|---------|------------------|
| `DATABASE_URL` | API, worker | Oui |
| `JWT_SECRET` | API, worker | Oui (fort, unique) |
| `MFA_ENCRYPTION_KEY` | API | Oui (64 hex = 32 octets) |
| `REDIS_HOST`, `REDIS_PORT` | API, worker | Oui si file e-mails |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | API, worker | Oui (fail-fast prod) |
| `NODE_ENV` | Tous | `production` |
| `EMAIL_DELIVERIES_INLINE` | API | **Non** / vide (utiliser worker) |
| `NEXT_PUBLIC_API_URL` | Web (build-time) | URL publique API (`https://…`) |
| `INTERNAL_API_URL` | Web (build-time) | URL réseau interne vers API (`http://api:3001` en Compose) |

**Web** : `NEXT_PUBLIC_*` et `INTERNAL_API_URL` sont figés au **`docker build`** — toute correction d’URL publique impose un **rebuild** image web.

Référence : [README.md](../../README.md) (Dokploy, worker, logs e-mail), [INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md](../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md).

---

## 4. Ordre de déploiement (recommandé)

```text
[1] Sauvegarde DB
[2] Migrations Prisma (job one-shot)
[3] Image API → démarrage API
[4] Image worker (même tag API) → démarrage worker
[5] Image Web (rebuild si changement front/env build) → démarrage Web
[6] Contrôles post-deploy + smoke métier
```

### 4.1 Sauvegarde base

- Snapshot volume Postgres **ou** `pg_dump` complet avant migration.
- Noter l’heure, le tag Git et l’état `prisma migrate status`.

### 4.2 Migrations Prisma

**Recommandation exploitation** : exécuter `migrate deploy` en **job one-shot** avant de basculer le trafic, plutôt que de s’appuyer uniquement sur le boot API (évite boucles de restart en cas d’échec — voir incident Prisma 2026-05-06).

**Docker Compose** (profil `standard`) :

```bash
docker compose --profile standard run --rm api sh -c \
  "cd /app/apps/api && npx prisma migrate deploy --schema=prisma/schema.prisma"
```

**Dokploy / conteneur API** (même image, commande ad hoc) :

```bash
pnpm --filter @starium-orchestra/api exec prisma migrate deploy
# ou, dans l’image :
# cd /app/apps/api && npx prisma migrate deploy --schema=prisma/schema.prisma
```

**Vérification** :

```bash
pnpm --filter @starium-orchestra/api exec prisma migrate status
```

En SQL si doute :

```sql
SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
ORDER BY started_at DESC
LIMIT 10;
```

> **Note** : le `CMD` actuel de `apps/api/Dockerfile` enchaîne `prisma:migrate` puis `node apps/api/dist/main.js`. En prod, préférer migrate **explicitement** en amont ; le boot peut rester en filet de sécurité seulement si l’équipe accepte le risque documenté dans l’incident.

**Seed** : réservé aux environnements vides / démo — **ne pas** relancer `prisma db seed` en prod sauf procédure documentée.

### 4.3 Build et publication des images

**API + worker** (même Dockerfile, même tag) :

```bash
docker build -f apps/api/Dockerfile -t starium-api:<TAG> .
```

**Web** (args build selon cible) :

```bash
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg INTERNAL_API_URL=http://api:3001 \
  -t starium-web:<TAG> .
```

Pousser les tags vers le registry utilisé par Dokploy / orchestrateur, puis déclencher le redeploy des services.

### 4.4 Démarrage des services

| Service | Commande prod | Port / exposition |
|---------|-----------------|-------------------|
| `postgres`, `redis` | Inchangés, healthy avant API | Interne |
| `api` | `node apps/api/dist/main.js` (après migrate) | HTTP 3001 |
| `api-worker` | `node apps/api/dist/worker/main.js` | Aucun port public |
| `web` | `node apps/web/.next/standalone/apps/web/server.js` | HTTP 3000 |

**Ordre** : Postgres + Redis healthy → API → worker → Web.

Compose local prod-like :

```bash
docker compose --profile standard up --build -d
```

### 4.5 Rollback applicatif

1. Repointer les services vers l’**image précédente** (API, worker, web).
2. **Ne pas** downgrader la base si des migrations **irréversibles** ont été appliquées — restaurer le snapshot §4.1.
3. Si migration en échec partiel : suivre [INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md](../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md) (`migrate resolve`, idempotence SQL).

---

## 5. Contrôles post-deploy

### 5.1 Santé technique

| Contrôle | Commande / action | Succès attendu |
|----------|-------------------|----------------|
| API écoute | `curl -sf http://<api-host>:3001/api/health` (ou route health documentée) | HTTP 2xx |
| Web | Ouvrir l’URL publique, login | Page charge, assets `/_next/static/*` OK |
| Migrations | `prisma migrate status` | « Database schema is up to date » |
| Worker | Logs `api-worker` : `[EMAIL worker]` | Pas d’erreur Redis / SMTP au démarrage |
| SMTP | Test fonctionnel (invitation, reset MDP) | Livraison ou log `[SMTP]` OK |

```bash
# Logs e-mail (Compose)
docker compose logs -f api api-worker 2>&1 | grep -E '\[EMAIL|\[SMTP\]'
```

### 5.2 Smoke fonctionnel (5–10 min)

- Connexion utilisateur test + **sélection client actif** (`X-Client-Id`).
- Lecture d’une ressource métier (ex. projet, budget) — pas de 403 inattendu.
- Une mutation autorisée (création brouillon ou PATCH sans impact métier critique).
- **Isolation** : impossible d’accéder à une ressource d’un autre client (échantillon connu).

### 5.3 Release « patch sécurité Web » uniquement

Exemple : correctif [CVE-2026-44578](https://nvd.nist.gov/vuln/detail/CVE-2026-44578) (Next.js SSRF WebSocket, self-hosted).

| Étape | Détail |
|-------|--------|
| Code | `next` / `eslint-config-next` ≥ `15.5.16` dans `apps/web/package.json` + lockfile |
| Build | **Rebuild obligatoire** image `web` (standalone embarque le runtime Next) |
| Deploy | Redéployer **uniquement** le service Web si API inchangée |
| Vérif | `docker compose exec web node -e "console.log(require('next/package.json').version)"` ≥ 15.5.16 |

Les déploiements **Vercel** ne sont pas concernés par ce CVE (avis éditeur) ; Orchestra en Docker **l’est**.

---

## 6. Déploiements fonctionnels org / ACL (optionnel)

Si la release inclut l’activation **ACCESS_DECISION_V2_*** ou backfills :

1. Ne pas mélanger avec un premier deploy « infra seule » sans lecture du runbook métier.
2. Suivre [migration-org-scope-access.md](./migration-org-scope-access.md) **par client**, **un module à la fois** : `projects` → `budgets` → `contracts` → `suppliers` → `strategic_vision`.
3. Utiliser le cockpit `/client/administration/access-model` (export CSV, checklist) après chaque module.

---

## 7. Traçabilité release

Renseigner dans le ticket / changelog déploiement :

- Tag Git / SHA
- Versions images (`starium-api`, `starium-web`)
- Migrations Prisma appliquées (liste depuis `migrate status`)
- Fenêtre horaire et opérateur
- Résultat smoke + anomalies

---

## 8. Références

| Document | Sujet |
|----------|--------|
| [README.md](../../README.md) | Install, Compose, Dokploy, worker |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Structure repo, multi-client |
| [INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md](../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md) | Recovery migrations |
| [migration-org-scope-access.md](./migration-org-scope-access.md) | Rollout flags org/ACL |
| [pnpm-audit-remediation.md](../security/pnpm-audit-remediation.md) | Overrides sécurité dépendances |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Pipeline CI |
