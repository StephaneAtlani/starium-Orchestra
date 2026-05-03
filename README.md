# Starium Orchestra

Plateforme SaaS de pilotage opérationnel pour DSI à temps partagé (multi-tenant, API-first).

## Prérequis

- Node.js 20+
- pnpm 9+
- Docker et Docker Compose (pour le run local)

## Installation

```bash
pnpm install
```

## Avant de déployer l’API

À lancer en CI ou en local **avec le même Node/pnpm** que la prod :

```bash
pnpm predeploy:api
```

Ça enchaîne **build Nest**, **typecheck** et les **tests Jest** du module e-mail (`src/modules/email/` : SMTP, `EmailService`, etc.).  
Optionnel, avec les vraies variables `SMTP_*` (fichier `.env` ou exports) :

```bash
pnpm --filter @starium-orchestra/api verify:smtp -- --strict
```

Pour toute la suite de tests du monorepo : `pnpm test` (plus long).

## Démarrage rapide environnement de dev

### Option 1 — Hot reload (recommandé) : Postgres Docker + API/Web en local (pnpm)

```bash
cp .env.example .env
cp .env.example apps/api/.env
docker compose up postgres -d
cd apps/api && pnpm prisma migrate dev && pnpm prisma db seed && pnpm start:dev
# autre terminal : pnpm --filter @starium-orchestra/web run dev
```

- API : `http://localhost:3001/api`, Web : `http://localhost:3000`, Postgres : `localhost:5432`.

### Option 2 — Tout dans Docker (images prod-like, pas de hot reload)

```bash
cp .env.example .env
cp .env.example apps/api/.env
docker compose --profile standard up --build -d
```

- **API** : `http://localhost:3001` — préfixe `/api`
- **Web** : `http://localhost:3002` (mapping Docker `3002:3000`, volontaire pour ne pas occuper `:3000` sur l’hôte)
- **PostgreSQL** : `localhost:5432` (user `starium`, db `starium`)

Migrations / seed depuis un conteneur one-shot (image API, `WORKDIR` = `apps/api`) :

```bash
docker compose --profile standard run --rm api sh -c "npx prisma migrate deploy && npx prisma db seed"
```

### Option 3 — Postgres seul, tout le reste en local

```bash
docker compose up postgres -d
# puis suivre la section « Développement sans Docker » ci-dessous
```

## Démarrage en local avec Docker

Le profil **`standard`** lance API + Web buildés (multi-stage), comme une stack locale proche de la prod. Pour le **hot reload**, utilise l’option 1 ci-dessus (`pnpm` sur la machine).

```bash
docker compose --profile standard up --build
```

Sans profil, `docker compose up` ne démarre que Postgres.

Variables d’environnement requises pour l’API : `DATABASE_URL`, `JWT_SECRET` (voir `.env.example` pour `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`). Le `docker-compose.yml` (profil `standard`) expose **`SMTP_HOST`**, **`SMTP_USER`**, **`SMTP_PASS`**, **`SMTP_FROM`** dans `x-api-base-env` avec interpolation `${…}` **sans** valeur par défaut : elles doivent être présentes au **parse** Compose (`.env` à la racine du projet, ou `docker compose --env-file apps/api/.env …`) sinon Compose met des chaînes vides qui **écrasent** `api.env_file`. Vérification : `docker compose exec api sh -lc 'env | grep ^SMTP_'`.

**Dokploy (ou autre PaaS)** : le clone Git n’embarque pas `.env`. Déclarer les mêmes clés dans **Variables d’environnement** du service **API** (ou équivalent). Ne pas laisser de variable `SMTP_*` vide dans l’UI (ça écrase une valeur correcte).

#### Worker BullMQ vs envoi inline

- **File + worker (recommandé en prod)** : ne **pas** définir `EMAIL_DELIVERIES_INLINE` (ou `false`). L’API logue `[EMAIL] mode=file` puis `[EMAIL queue] bullJobId=…` ; le **worker** (autre conteneur / processus) logue `[EMAIL worker]`, puis `[EMAIL send]` et `[SMTP]` quand Brevo répond.
- **Sans worker** : soit tu lances le worker (voir ci-dessous), soit tu mets **`EMAIL_DELIVERIES_INLINE=true`** sur l’API : alors `[EMAIL] mode=inline` et tout le SMTP part **dans le même processus** que l’API (pas de `[EMAIL queue]`).

**Dokploy — activer le worker** : deux applications (ou deux services) à partir de la **même image** Docker que l’API.

1. **API** : inchangé (ex. `pnpm prisma migrate deploy` + `node apps/api/dist/main.js` selon ton Dockerfile).
2. **Worker** : **même image**, **sans** migrate ; commande de démarrage : `node apps/api/dist/worker/main.js` (le Dockerfile de l’API pose `WORKDIR /app` à la racine du monorepo). Variables **identiques** à l’API pour au minimum `DATABASE_URL`, `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`, `SMTP_*`, `JWT_SECRET`, `NODE_ENV=production`. Aucun port public.

**Docker Compose** : le fichier `docker-compose.yml` inclut le service **`api-worker`** (`command: node apps/api/dist/worker/main.js`). Logs : `docker compose logs -f api-worker`.

#### Où voir les logs `[EMAIL]` / `[SMTP]` (réponse)

Ce ne sont **pas** des logs navigateur ni MailHog : c’est **stdout du processus Node** (Nest) dans le **conteneur qui exécute l’API**.

- **Dokploy** : ouvre ton **projet** → l’**application** qui héberge l’API → onglet ou entrée **Logs** / **Runtime logs** (souvent à côté de *Deployments*). C’est là que défilent les lignes `Nest` avec `[EmailService]`, `[QueueService]`, etc. Si tu as un **second** service *worker*, les lignes `[EMAIL worker]` sont **dans les logs de ce conteneur-là**, pas dans l’API.
- **Docker Compose** : `docker compose logs -f api` (API) et `docker compose logs -f api-worker` (worker e-mail).
- **Filtre rapide** : `docker compose logs api api-worker 2>&1 | grep -E '\[EMAIL|\[SMTP\]'` (même idée sur les logs exportés depuis Dokploy).

Préfixes utiles : `[EMAIL]` (création livraison, `mode=inline` vs `mode=file`), `[EMAIL queue]` (id job BullMQ), `[EMAIL send]` (début / échec SMTP), `[EMAIL worker]` (uniquement le worker), `[SMTP]` (réponse serveur après envoi OK).

**Valider SMTP** (même stack que l’API : `buildSmtpTransportOptions` + `verify()` Nodemailer) : à la racine du monorepo, avec les mêmes `SMTP_*` / `NODE_ENV` qu’en prod (fichier `.env` ou exports) :

```bash
pnpm --filter @starium-orchestra/api verify:smtp -- --strict
# optionnel : un message réel (parcimonie : quotas / anti-spam)
pnpm --filter @starium-orchestra/api verify:smtp -- --strict --send=ton-email@example.com
```

Dans l’image Docker (si `pnpm` + dépendances présents) :  
`docker compose exec api sh -lc 'cd /app && pnpm --filter @starium-orchestra/api verify:smtp -- --strict'`

### Développement 100% Docker avec hot reload (stack `docker-compose.dev.yml`)

Cette stack lance `postgres`, `api-dev` (Nest watch) et `web-dev` (Next dev) avec montages de sources.

```bash
cp .env.example .env
cp .env.example apps/api/.env
docker compose -f docker-compose.dev.yml up -d --build
```

- Web : `http://localhost:3000`
- API : `http://localhost:3001/api`
- **MailHog** (capture SMTP dev — OTP MFA, etc.) : UI `http://localhost:8025` ; l’API `api-dev` envoie le fallback MFA vers MailHog (`SMTP_HOST=mailhog`, `SMTP_PORT=1025` — voir `docker-compose.dev.yml`).
- **E-mails en file (comme prod)** : par défaut `EMAIL_DELIVERIES_INLINE=false` ; le service **`api-worker-dev`** consomme BullMQ avec `REDIS_HOST=redis` sur le réseau compose. Logs : `docker compose -f docker-compose.dev.yml logs -f api-worker-dev`. Pour tout envoyer dans `api-dev` sans worker : `EMAIL_DELIVERIES_INLINE=true` dans le `.env` racine (interpolé par Compose).
- **Vérification e-mail (identités secondaires)** : le `.env` à la racine du repo est interpolé par Compose (`EMAIL_IDENTITY_VERIFY_*`, `STARIUM_SKIP_EMAIL_IDENTITY_RESEND_COOLDOWN`, etc.) ; voir `docker-compose.dev.yml` et `.env.example`.

Important en dev Docker:
- Si `apps/api/package.json` ou `apps/api/prisma/schema.prisma` change, redémarrer `api-dev` pour resynchroniser les dépendances et régénérer le client Prisma.
- **Web (`web-dev`)** : les rewrites Next (`/api/*` → Nest) utilisent **`INTERNAL_API_URL`** (URL vue par le conteneur, ex. `http://api-dev:3001`). Le bundle expose **`NEXT_PUBLIC_API_URL`** au navigateur (ex. `http://localhost:3001` pour joindre l’API publiée sur l’hôte). Voir `docker-compose.dev.yml` — ne pas mettre le hostname Docker dans `NEXT_PUBLIC_*` si le navigateur est sur la machine hôte.
- **S3 / buckets documents clients (RFC-035)** : config **nominal = Administration plateforme** (type de stockage S3, **« Activer la configuration en base »**, clé d’accès, secret, bucket de **test de connexion**, **préfixe buckets par client**, **région** ex. `eu-west-3`). Chaque client reçoit un **bucket S3** nommé `{préfixe}-{slug}` (créé à la demande). Les variables **`PROCUREMENT_S3_*`** dans `apps/api/.env` restent un **secours** (CI). Le **driver** suit la **base** ; `PROCUREMENT_STORAGE_DRIVER` : repli sans ligne plateforme. Voir `.env.example` (section Procurement).

```bash
docker compose -f docker-compose.dev.yml up -d --force-recreate api-dev
```

Vérification de l’endpoint health :

```bash
curl http://localhost:3001/api/health
```

Réponse attendue (ex.) : `{"status":"ok","database":"connected","timestamp":"..."}`.

### Authentification (RFC-002)

Endpoints : `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`. JWT access token (15 min) + refresh token (7 jours), hash bcrypt des mots de passe, hash SHA-256 des refresh tokens en base.

Après avoir exécuté le seed (`pnpm prisma db seed` depuis `apps/api`, ou la commande `docker compose --profile standard run --rm api …` ci-dessus), les utilisateurs de test suivants sont disponibles :

- **Platform Admin** : `admin@starium.fr` / `mot de passe` (aucun client rattaché)
- **Client Admin (client Sitral)** : `satlani@outlook.com` / `password`

Exemple de login :

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@starium.fr","password":"mot de passe"}'
```

Réponse : `{"accessToken":"...","refreshToken":"..."}`. Utiliser `Authorization: Bearer <accessToken>` pour les routes protégées.

## Développement sans Docker (API + Web)

1. Démarrer PostgreSQL (ex. via Docker) :

   ```bash
   docker compose up postgres -d
   ```

2. Créer `.env` à partir de `.env.example` (adapter `DATABASE_URL` si besoin).

3. Migrations, seed (utilisateur de test) et démarrage API :

   Depuis `apps/api` (avec un `.env` contenant `DATABASE_URL` et `JWT_SECRET`) :

   ```bash
   cd apps/api
   pnpm prisma migrate dev --name init   # ou pnpm prisma db push en dev
   pnpm prisma db seed
   pnpm start:dev
   ```

   Ou depuis la racine :

   ```bash
   pnpm --filter @starium-orchestra/api exec prisma migrate deploy
   pnpm --filter @starium-orchestra/api run prisma:seed
   pnpm --filter @starium-orchestra/api run start:dev
   ```
   (Le seed nécessite que `apps/api/.env` existe pour `DATABASE_URL`.)

4. Dans un autre terminal, démarrer le frontend :

   ```bash
   pnpm --filter @starium-orchestra/web run dev
   ```

## Scripts racine

| Script      | Description                          |
|------------|--------------------------------------|
| `pnpm lint`     | Lint de tous les workspaces          |
| `pnpm typecheck`| Vérification TypeScript              |
| `pnpm build`    | Build (types, api, web)              |
| `pnpm test`     | Tests (placeholder pour l’instant)   |

Dans `apps/api` : `pnpm prisma:migrate` (migrations), `pnpm prisma:seed` (utilisateur de test pour l’auth).

## Structure

- `apps/api` — Backend NestJS (Prisma, PostgreSQL)
- `apps/web` — Frontend Next.js (App Router, Tailwind)
- `packages/types` — Types partagés (ex. réponses API)
- `packages/config` — Configurations partagées (ESLint)
- `docs/` — Architecture, vision produit, RFC

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et [docs/VISION_PRODUIT.md](docs/VISION_PRODUIT.md).

## CI

Le pipeline (GitHub Actions) exécute sur push/PR vers `main` ou `develop` :

- Lint, typecheck, build
- Déploiement des migrations Prisma sur une base PostgreSQL de test


# DEPLOIEMENT :
pnpm exec prisma generate --schema=prisma/schema.prisma
pnpm run prisma:seed

