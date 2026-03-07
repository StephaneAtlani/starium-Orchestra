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
docker compose up --build
```

- **API** : http://localhost:3001 — préfixe `/api` (ex. `GET http://localhost:3001/api/health`)
- **Web** : http://localhost:3000
- **PostgreSQL** : localhost:5432 (user `starium`, db `starium`)

Vérification de l’endpoint health :

```bash
curl http://localhost:3001/api/health
```

Réponse attendue (ex.) : `{"status":"ok","database":"connected","timestamp":"..."}`.

## Développement sans Docker (API + Web)

1. Démarrer PostgreSQL (ex. via Docker) :

   ```bash
   docker compose up postgres -d
   ```

2. Créer `.env` à partir de `.env.example` (adapter `DATABASE_URL` si besoin).

3. Migrations et démarrage API :

   ```bash
   pnpm --filter @starium-orchestra/api exec prisma migrate deploy
   pnpm --filter @starium-orchestra/api run start:dev
   ```

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
