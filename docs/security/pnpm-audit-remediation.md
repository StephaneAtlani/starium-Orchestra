# Remédiation audit pnpm (pré-prod)

Document associé aux `pnpm.overrides` définis à la racine du monorepo (`package.json` → `pnpm.overrides`).

## Overrides (tous les workspaces)

| Override | Motif |
|----------|--------|
| `multer` → `^2.1.1` | Chaîne Nest 10 / `@nestjs/platform-express` : DoS corrigés à partir de 2.1.1. |
| `handlebars` → `^4.7.9` | Dépendance transitive (ex. `ts-jest`) : correctifs injection / DoS. |
| `glob` → `^10.5.0` | CLI Nest / Jest : injection de commande corrigée en 10.5.x. |
| `flatted` → `^3.4.2` | Chaîne ESLint / `flat-cache` : DoS + prototype pollution. |
| `vite` → `^7.3.2` | Vitest sous `apps/web` : correctifs `server.fs.deny` + WebSocket dev. |
| `path-to-regexp` → `^0.1.13` | Express 4 : ReDoS sur routes à paramètres multiples. |
| `lodash` → `^4.18.0` | Chaîne `@nestjs/cli` / inquirer : `_.template` / clés d’import. |
| `picomatch@2.3.1` → `2.3.2` | ReDoS (branche 2.x). |
| `picomatch@4.0.1` → `4.0.4` | ReDoS (branche 4.x, Angular devkit). |
| `picomatch@4.0.3` → `4.0.4` | Alignement peer `fdir` / `tinyglobby` (typescript-eslint). |
| `effect` → `^3.20.0` | Chaîne Prisma `@prisma/config` : ALS / RPC (GHSA-38f7-945m-qr2g). |
| `defu` → `^6.1.5` | Chaîne Prisma / `c12` : prototype pollution (GHSA-737v-mqg7-c878). |

## Changements de dépendances directs (hors overrides)

- **`apps/api`** : `xlsx` remplacé par **`exceljs`** (import budget) ; **`bcrypt`** remplacé par **`bcryptjs`** via `src/lib/bcrypt-compat.ts` (même API async).
- **`apps/web`** : **`next`** / **`eslint-config-next`** en **≥ 15.5.15**.

Après toute évolution majeure des outils, relancer `pnpm install` puis `pnpm audit --audit-level high` et retirer ou ajuster les overrides devenus inutiles ou conflictuels.
