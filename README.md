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

## Démarrage en local avec Docker

```bash
cp .env.example .env
cp .env.example apps/api/.env
docker compose up --build
```

- **API** : http://localhost:3001 — préfixe `/api` (ex. `GET http://localhost:3001/api/health`)
- **Web** : http://localhost:3000
- **PostgreSQL** : localhost:5432 (user `starium`, db `starium`)

Variables d’environnement requises pour l’API : `DATABASE_URL`, `JWT_SECRET` (voir `.env.example` pour `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`).

Vérification de l’endpoint health :

```bash
curl http://localhost:3001/api/health
```

Réponse attendue (ex.) : `{"status":"ok","database":"connected","timestamp":"..."}`.

### Authentification (RFC-002)

Endpoints : `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`. JWT access token (15 min) + refresh token (7 jours), hash bcrypt des mots de passe, hash SHA-256 des refresh tokens en base.

Après avoir exécuté le seed (`pnpm prisma:seed` depuis `apps/api`), un utilisateur de test est disponible :

- **Email** : `satlani@outlook.com`
- **Mot de passe** : `D!diablo15`

Exemple de login :

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"satlani@outlook.com","password":"D!diablo15"}'
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
   pnpm prisma:migrate
   pnpm prisma:seed
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
