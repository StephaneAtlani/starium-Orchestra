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

### Backend Budget Management (RFC-015-2)

- **Module** `budget-management` : CRUD de la structure budgétaire (exercices, budgets, enveloppes, lignes).
- **API** :
  - `GET/POST /api/budget-exercises`, `GET/PATCH /api/budget-exercises/:id`
  - `GET/POST /api/budgets`, `GET/PATCH /api/budgets/:id`
  - `GET/POST /api/budget-envelopes`, `GET/PATCH /api/budget-envelopes/:id`
  - `GET/POST /api/budget-lines`, `GET/PATCH /api/budget-lines/:id`
- **Règles** : pas de `clientId` dans les body (client actif) ; codes optionnels en entrée, générés si absents (EX-, BUD-, ENV-, BL-) ; montants en `number` en API ; pas de suppression physique.
- **Audit** : création et mise à jour tracées (budget_exercise.created/updated, budget.created/updated, etc.).

Détail : [docs/API.md](../API.md) §15 (Structure budgétaire).

### Backend Financial Core (RFC-015-1B)

- **Module** `financial-core` : allocations, événements, recalcul des lignes.
- **API** :
  - `GET /api/financial-allocations`, `POST /api/financial-allocations`
  - `GET /api/financial-events`, `POST /api/financial-events`
  - `GET /api/budget-lines/:id/allocations`, `GET /api/budget-lines/:id/events`
- **Recalcul** : à chaque création d’allocation ou d’événement (types COMMITMENT_REGISTERED / CONSUMPTION_REGISTERED), les champs `forecastAmount`, `committedAmount`, `consumedAmount`, `remainingAmount` de la `BudgetLine` sont recalculés (formule MVP : remaining = revisedAmount − committed − consumed).
- **Audit** : création d’allocation et d’événement tracées en audit log.

Détail : [docs/API.md](../API.md) §16 (Noyau financier).

---

## 2. Ce qui n’est pas implémenté

- **Frontend** : aucune interface utilisateur pour les budgets dans cette phase.
- **Suppression physique** : pas d’endpoint DELETE sur la structure budgétaire (RFC-015-2).
- **Snapshots, axes analytiques, imports/exports Excel, duplication de budget, workflow d’approbation** : hors périmètre du MVP.

---

## 3. Comment créer un budget (données de test ou dev)

### Option A : API Budget Management (recommandé)

1. S’assurer que le **module budgets** est activé pour le client et que l’utilisateur a les permissions `budgets.read`, `budgets.create`, `budgets.update`.
2. Appeler avec `Authorization: Bearer <accessToken>` et `X-Client-Id: <clientId>` :
   - `POST /api/budget-exercises` (name, startDate, endDate ; code optionnel)
   - `POST /api/budgets` (exerciseId, name, currency ; code optionnel)
   - `POST /api/budget-envelopes` (budgetId, name, type ; code optionnel)
   - `POST /api/budget-lines` (budgetId, envelopeId, name, expenseType, initialAmount, currency ; code optionnel)

Voir [docs/API.md](../API.md) §15 pour les body complets.

### Option B : Prisma Studio

1. Lancer Prisma Studio : `cd apps/api && pnpm exec prisma studio`
2. Créer dans l’ordre : BudgetExercise → Budget → BudgetEnvelope → BudgetLine (mêmes champs que ci-dessus).

### Option C : Seed ou script

Étendre `apps/api/prisma/seed.js` pour créer, après les clients et modules, un BudgetExercise, un Budget, une BudgetEnvelope, une BudgetLine (données reproductibles pour tests).

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
- **RFC-015-2** : Budget Management Backend (structure budgétaire)
- **RFC-015-1B** : Financial Core Backend (allocations, événements)
- **Plan d’implémentation** : [docs/RFC/RFC-015-1B-implementation-plan.md](../RFC/RFC-015-1B-implementation-plan.md)
- **API** : [docs/API.md](../API.md) (§15 Structure budgétaire, §16 Noyau financier)
- **Architecture** : [docs/ARCHITECTURE.md](../ARCHITECTURE.md) (§5.3 Noyau financier, §6.1 Modules)
