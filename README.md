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

Variables d’environnement requises pour l’API : `DATABASE_URL`, `JWT_SECRET` (voir `.env.example` pour `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`).

### Développement 100% Docker avec hot reload (stack `docker-compose.dev.yml`)

Cette stack lance `postgres`, `api-dev` (Nest watch) et `web-dev` (Next dev) avec montages de sources.

```bash
cp .env.example .env
cp .env.example apps/api/.env
docker compose -f docker-compose.dev.yml up -d --build
```

- Web : `http://localhost:3000`
- API : `http://localhost:3001/api`
- **MailHog** (capture des emails SMTP, stack dev uniquement) : UI `http://localhost:8025` — l’API `api-dev` envoie le fallback MFA email vers MailHog (`SMTP_HOST=mailhog` dans `docker-compose.dev.yml`).

Important en dev Docker:
- Si `apps/api/package.json` ou `apps/api/prisma/schema.prisma` change, redémarrer `api-dev` pour resynchroniser les dépendances et régénérer le client Prisma.
- **Web (`web-dev`)** : les rewrites Next (`/api/*` → Nest) utilisent **`INTERNAL_API_URL`** (URL vue par le conteneur, ex. `http://api-dev:3001`). Le bundle expose **`NEXT_PUBLIC_API_URL`** au navigateur (ex. `http://localhost:3001` pour joindre l’API publiée sur l’hôte). Voir `docker-compose.dev.yml` — ne pas mettre le hostname Docker dans `NEXT_PUBLIC_*` si le navigateur est sur la machine hôte.

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

