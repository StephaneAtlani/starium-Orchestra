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

### Option 1 — Tout via Docker (recommandé)

```bash
# À la racine du repo
cp .env.example .env
cp .env.example apps/api/.env

docker compose --profile dev up --build
```

- Postgres, API Nest (`api-dev`) et Web (`web-dev`) sont lancés.
- API dev : `http://localhost:3001/api`
- Web dev : `http://localhost:3000` (pointe sur `api-dev`)

### Option 2 — Tout dans Docker (migrations/seed compris)

> Recommandé si tu ne veux **jamais** installer Node/pnpm en local pour l’API.

```bash
# 1. Préparer les fichiers d'environnement
cp .env.example .env
cp .env.example apps/api/.env

# 2. Lancer Postgres + api-dev + web-dev (profil dev)
docker compose --profile dev up -d

# 3. Migrations et seed (conteneur api-dev)
docker compose --profile dev run --rm api-dev pnpm exec prisma migrate deploy
docker compose --profile dev run --rm api-dev pnpm exec prisma db seed
```

L’API dev tourne sur `http://localhost:3001/api`, le web sur `http://localhost:3000`.

Tu peux tester la santé avec :

```bash
curl http://localhost:3001/api/health
```

### Option 3 — API en local, Postgres via Docker

```bash
# 1. Lancer Postgres
docker compose up postgres -d

# 2. Créer et remplir apps/api/.env (à partir de .env.example)
cd apps/api

# 3. Synchroniser le schéma et lancer le seed
docker compose --profile dev exec api-dev pnpm prisma migrate dev --name init   # ou prisma db push en dev
docker compose --profile dev exec api-dev pnpm prisma db seed

# 4. Démarrer l'API Nest
docker compose --profile dev exec api-dev pnpm start:dev
```

L’API est alors disponible sur `http://localhost:3001/api`.  
Tu peux tester la santé avec :

```bash
curl http://localhost:3001/api/health
```

## Démarrage en local avec Docker

### Mode dev (recommandé) — hot reload API + front câblé sur api-dev

```bash
cp .env.example .env
cp .env.example apps/api/.env
docker compose --profile dev up --build
```

- **API (api-dev)** : http://localhost:3001 — hot reload (volumes `src`, `prisma`)
- **Web (web-dev)** : http://localhost:3000 — proxy /api/* vers l’API (3001). Hot reload activé via `WATCHPACK_POLLING` et `CHOKIDAR_USEPOLLING` (détection des changements de fichiers dans le conteneur).
- **PostgreSQL** : localhost:5432 (user `starium`, db `starium`)
- **Prisma** : si le schéma change, <abbr title="docker compose --profile dev exec api-dev sh -c &quot;cd /app/apps/api && pnpm exec prisma generate&quot;">régénérez le client dans le conteneur</abbr> puis `docker compose --profile dev restart api-dev`.

### Mode standard — api + web sans hot reload

```bash
docker compose --profile standard up --build
```

- **API** : http://localhost:3001 — préfixe `/api` (ex. `GET http://localhost:3001/api/health`)
- **Web** : http://localhost:3000
- **PostgreSQL** : localhost:5432 (user `starium`, db `starium`)

Sans profil, `docker compose up` ne démarre que Postgres.

Variables d’environnement requises pour l’API : `DATABASE_URL`, `JWT_SECRET` (voir `.env.example` pour `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`).

Vérification de l’endpoint health :

```bash
curl http://localhost:3001/api/health
```

Réponse attendue (ex.) : `{"status":"ok","database":"connected","timestamp":"..."}`.

### Authentification (RFC-002)

Endpoints : `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`. JWT access token (15 min) + refresh token (7 jours), hash bcrypt des mots de passe, hash SHA-256 des refresh tokens en base.

Après avoir exécuté le seed (`pnpm prisma db seed` depuis `apps/api`, ou `docker compose --profile dev run --rm api-dev pnpm exec prisma db seed`), les utilisateurs de test suivants sont disponibles :

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
