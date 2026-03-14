# Module Budget MVP — État et utilisation

Ce document décrit l’état actuel du module Budget (MVP) et comment créer des données budgétaires pour utiliser le noyau financier.

---

## 1. Ce qui est en place

### Schéma Prisma (RFC-015-1A)

- **BudgetExercise** : exercice budgétaire (clientId, name, code, startDate, endDate, status).
- **Budget** : budget (clientId, exerciseId, name, code, currency, status, ownerUserId optionnel).
- **BudgetEnvelope** : enveloppe (clientId, budgetId, parentId optionnel, name, code, type RUN/BUILD/TRANSVERSE).
- **BudgetLine** : ligne budgétaire (clientId, budgetId, envelopeId, code, name, expenseType, currency, montants : initialAmount, revisedAmount, forecastAmount, committedAmount, consumedAmount, remainingAmount).
- **FinancialAllocation** : allocation sur une ligne (budgetLineId, sourceType, sourceId, allocationType, allocatedAmount, etc.).
- **FinancialEvent** : événement financier (budgetLineId, sourceType, sourceId?, eventType, amount, eventDate, label, etc.).

Les enums sont définis dans le schéma : `AllocationType`, `FinancialEventType`, `FinancialSourceType`, `BudgetExerciseStatus`, `BudgetStatus`, `BudgetEnvelopeType`, `BudgetLineStatus`, `ExpenseType`.

### Backend Financial Core (RFC-015-1B)

- **Module** `financial-core` : allocations, événements, recalcul des lignes.
- **API** :
  - `GET /api/financial-allocations`, `POST /api/financial-allocations`
  - `GET /api/financial-events`, `POST /api/financial-events`
  - `GET /api/budget-lines/:id/allocations`, `GET /api/budget-lines/:id/events`
- **Recalcul** : à chaque création d’allocation ou d’événement (types COMMITMENT_REGISTERED / CONSUMPTION_REGISTERED), les champs `forecastAmount`, `committedAmount`, `consumedAmount`, `remainingAmount` de la `BudgetLine` sont recalculés (formule MVP : remaining = revisedAmount − committed − consumed).
- **Audit** : création d’allocation et d’événement tracées en audit log.

Détail des endpoints, body et erreurs : [docs/API.md](../API.md#15-noyau-financier--apifinancial-allocations-apifinancial-events-apibudget-lines).

---

## 2. Ce qui n’est pas implémenté

- **CRUD exercices budgétaires** : pas d’API pour créer/modifier/supprimer des `BudgetExercise`.
- **CRUD budgets** : pas d’API pour créer/modifier/supprimer des `Budget`.
- **CRUD enveloppes** : pas d’API pour créer/modifier/supprimer des `BudgetEnvelope`.
- **CRUD lignes budgétaires** : pas d’API pour créer/modifier/supprimer des `BudgetLine`.
- **Frontend** : aucune interface utilisateur pour les budgets dans cette phase.
- **Snapshots, axes analytiques, imports/exports Excel** : hors périmètre du MVP.

---

## 3. Comment créer un budget (données de test ou dev)

Les API du financial-core s’appuient sur des **BudgetLine** existantes. Pour en avoir, il faut créer les données en base **en dehors de l’API** (pour l’instant).

### Option A : Prisma Studio

1. Lancer Prisma Studio : `cd apps/api && pnpm exec prisma studio`
2. Créer dans l’ordre :
   - un **BudgetExercise** (clientId, name, code, startDate, endDate, status = DRAFT ou ACTIVE)
   - un **Budget** (clientId, exerciseId, name, code, currency, status = DRAFT ou ACTIVE)
   - un **BudgetEnvelope** (clientId, budgetId, name, code, type = RUN ou BUILD ou TRANSVERSE)
   - une **BudgetLine** (clientId, budgetId, envelopeId, code, name, expenseType = OPEX ou CAPEX, currency, revisedAmount, etc. ; les montants calculés peuvent rester à 0, ils seront mis à jour par le recalcul lors des créations d’allocations/événements)

### Option B : Seed ou script

Étendre `apps/api/prisma/seed.js` (ou un script dédié) pour créer, après les clients et modules :

- un Client (ou réutiliser un existant)
- l’activation du module `budgets` pour ce client (ClientModule)
- un BudgetExercise, un Budget, une BudgetEnvelope, une BudgetLine

Cela permet d’avoir des données reproductibles pour tester les API financial-core.

### Option C : Future API

Une future RFC pourra ajouter les endpoints de type :

- `POST /api/budget-exercises`, `GET /api/budget-exercises`, etc.
- `POST /api/budgets`, `GET /api/budgets`, etc.
- `POST /api/budget-envelopes`, …
- `POST /api/budget-lines`, …

Jusque-là, la création des structures budgétaires reste manuelle ou via seed.

---

## 4. Tester le financial-core

Une fois qu’une **BudgetLine** existe pour un client :

1. S’assurer que le **module budgets** est activé pour ce client (`ClientModule` ENABLED pour le module `budgets`).
2. Avoir un utilisateur rattaché à ce client avec un rôle disposant des permissions **budgets.read** et **budgets.create**.
3. Se connecter (POST `/api/auth/login`), puis appeler les API avec :
   - `Authorization: Bearer <accessToken>`
   - `X-Client-Id: <clientId>`
4. Exemples :
   - `POST /api/financial-allocations` avec un body contenant `budgetLineId`, `sourceType`, `sourceId` (ou vide si MANUAL), `allocationType`, `allocatedAmount`, `currency`.
   - `GET /api/budget-lines/<budgetLineId>/allocations` pour lister les allocations de la ligne.

Voir [docs/API.md](../API.md#15-noyau-financier--apifinancial-allocations-apifinancial-events-apibudget-lines) pour les formats complets et les tests unitaires : `pnpm test financial-core` depuis `apps/api`.

---

## 5. Références

- **RFC-015-1A** : Schéma Prisma Budget MVP
- **RFC-015-1B** : Financial Core Backend
- **Plan d’implémentation** : [docs/RFC/RFC-015-1B-implementation-plan.md](../RFC/RFC-015-1B-implementation-plan.md)
- **API** : [docs/API.md](../API.md)
- **Architecture** : [docs/ARCHITECTURE.md](../ARCHITECTURE.md) (§5.3 Noyau financier, §6.1 Modules)
