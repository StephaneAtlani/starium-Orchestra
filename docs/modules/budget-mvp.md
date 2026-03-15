# Module Budget MVP — État et utilisation

Ce document décrit l’état actuel du module Budget (MVP) et comment créer des données budgétaires pour utiliser le noyau financier.

---

## 1. Ce qui est en place

### Schéma Prisma (RFC-015-1A, RFC-019, RFC-021)

- **BudgetExercise** : exercice budgétaire (clientId, name, code, startDate, endDate, status).
- **Budget** : budget (clientId, exerciseId, name, code, currency, status, ownerUserId optionnel). Extension RFC-019 : versionSetId?, versionNumber?, versionLabel?, versionKind? (BASELINE/REVISION), versionStatus? (DRAFT/ACTIVE/SUPERSEDED/ARCHIVED), parentBudgetId?, activatedAt?, archivedAt?, isVersioned.
- **BudgetVersionSet** (RFC-019) : ensemble de versions (clientId, exerciseId, code, name, description?, baselineBudgetId?, activeBudgetId?). Relations nommées : versions, baselineBudget, activeBudget.
- **BudgetEnvelope** : enveloppe (clientId, budgetId, parentId optionnel, name, code, type RUN/BUILD/TRANSVERSE).
- **BudgetLine** : ligne budgétaire (clientId, budgetId, envelopeId, code, name, expenseType, currency, montants : initialAmount, revisedAmount, forecastAmount, committedAmount, consumedAmount, remainingAmount). Extension RFC-021 : generalLedgerAccountId (obligatoire), analyticalLedgerAccountId?, allocationScope (ENTERPRISE | ANALYTICAL), relations generalLedgerAccount, analyticalLedgerAccount, costCenterSplits.
- **GeneralLedgerAccount**, **AnalyticalLedgerAccount**, **CostCenter** (RFC-021) : catalogues client (clientId, code, name, description?, isActive, sortOrder) ; unicité code par client.
- **BudgetLineCostCenterSplit** (RFC-021) : ventilation par centre de coûts (budgetLineId, costCenterId, percentage) ; unicité (budgetLineId, costCenterId) ; somme des pourcentages = 100 % pour les lignes ANALYTICAL.
- **FinancialAllocation** : allocation sur une ligne (budgetLineId, sourceType, sourceId, allocationType, allocatedAmount, etc.).
- **FinancialEvent** : événement financier (budgetLineId, sourceType, sourceId?, eventType, amount, eventDate, label, etc.).
- **BudgetReallocation** (RFC-017) : réallocation entre deux lignes (clientId, budgetId, sourceLineId, targetLineId, amount, currency, reason?, createdById?, createdAt). Chaque réallocation génère deux FinancialEvent de type REALLOCATION_DONE (source : montant négatif ; cible : montant positif).

Les enums sont définis dans le schéma : `AllocationType`, `FinancialEventType` (dont REALLOCATION_DONE), `FinancialSourceType`, `BudgetExerciseStatus`, `BudgetStatus`, `BudgetEnvelopeType`, `BudgetLineStatus`, `ExpenseType`, `BudgetVersionKind` (BASELINE, REVISION), `BudgetVersionStatus` (DRAFT, ACTIVE, SUPERSEDED, ARCHIVED), `BudgetLineAllocationScope` (ENTERPRISE, ANALYTICAL).

### Backend Budget Management (RFC-015-2, RFC-021)

- **Module** `budget-management` : CRUD de la structure budgétaire (exercices, budgets, enveloppes, lignes) et des référentiels analytiques (comptes comptables, comptes analytiques, centres de coûts).
- **API** :
  - `GET/POST /api/budget-exercises`, `GET/PATCH /api/budget-exercises/:id`
  - `GET/POST /api/budgets`, `GET/PATCH /api/budgets/:id`
  - `GET/POST /api/budget-envelopes`, `GET/PATCH /api/budget-envelopes/:id`
  - `GET/POST /api/budget-lines`, `GET/PATCH /api/budget-lines/:id` (avec champs analytiques : generalLedgerAccountId, analyticalLedgerAccountId?, allocationScope, costCenterSplits?)
  - `GET/POST /api/general-ledger-accounts`, `GET/PATCH /api/general-ledger-accounts/:id`
  - `GET/POST /api/analytical-ledger-accounts`, `GET/PATCH /api/analytical-ledger-accounts/:id`
  - `GET/POST /api/cost-centers`, `GET/PATCH /api/cost-centers/:id`
- **Règles** : pas de `clientId` dans les body (client actif) ; codes optionnels en entrée, générés si absents (EX-, BUD-, ENV-, BL-) ; montants en `number` en API ; pas de suppression physique. Pour les lignes : generalLedgerAccountId obligatoire ; ENTERPRISE = 0 split ; ANALYTICAL = au moins 1 split, somme 100 % ; unicité du centre de coûts par ligne.
- **Audit** : création et mise à jour tracées (budget_exercise.created/updated, budget.created/updated, general_ledger_account.created/updated, etc.).

Détail : [docs/API.md](../API.md) §15 (Structure budgétaire), [docs/modules/analytical-dimensions-rfc021.md](analytical-dimensions-rfc021.md) (dimensions analytiques).

### Backend Financial Core (RFC-015-1B)

- **Module** `financial-core` : allocations, événements, recalcul des lignes.
- **API** :
  - `GET /api/financial-allocations`, `POST /api/financial-allocations`
  - `GET /api/financial-events`, `POST /api/financial-events`
  - `GET /api/budget-lines/:id/allocations`, `GET /api/budget-lines/:id/events`
- **Recalcul** : à chaque création d’allocation ou d’événement (types COMMITMENT_REGISTERED / CONSUMPTION_REGISTERED, ou après une réallocation avec REALLOCATION_DONE), les champs `forecastAmount`, `committedAmount`, `consumedAmount`, `remainingAmount` de la `BudgetLine` sont recalculés. Base budgétaire effective = revisedAmount + somme des événements REALLOCATION_DONE ; remaining = base effective − committed − consumed.
- **Audit** : création d’allocation et d’événement tracées en audit log.

Détail : [docs/API.md](../API.md) §16 (Noyau financier).

### Backend Budget Reporting (RFC-016, RFC-021)

- **Module** `budget-reporting` : agrégations et KPI budgétaires en **lecture seule** (exercice, budget, enveloppe).
- **API** (toutes en GET, permission `budgets.read`) :
  - `GET /api/budget-reporting/exercises/:id/summary` — KPI exercice
  - `GET /api/budget-reporting/exercises/:id/budgets` — liste budgets + KPI (pagination, search, status)
  - `GET /api/budget-reporting/budgets/:id/summary` — KPI budget
  - `GET /api/budget-reporting/budgets/:id/envelopes` — liste enveloppes + KPI (pagination, type, parentId, includeChildren)
  - `GET /api/budget-reporting/budgets/:id/breakdown-by-type` — répartition RUN/BUILD/TRANSVERSE
  - `GET /api/budget-reporting/budgets/:id/totals-by-cost-center` (RFC-021) — totaux par centre de coûts (lignes ANALYTICAL uniquement ; revisedAmount / remainingAmount)
  - `GET /api/budget-reporting/budgets/:id/totals-by-general-ledger-account` (RFC-021) — totaux par compte comptable (toutes lignes)
  - `GET /api/budget-reporting/envelopes/:id/summary` — KPI enveloppe (option includeChildren)
  - `GET /api/budget-reporting/envelopes/:id/lines` — lignes avec ratios et alertes (pagination, search, status)
- **Règles** : une seule devise par périmètre (400 si plusieurs) ; ratios = 0 si revisedAmount = 0 ; `currency` présent dans toutes les réponses KPI ; search uniquement sur name/code.
- **Pas de modification** des modules budget-management ni financial-core ; consommation des données en lecture.

Détail : [docs/API.md](../API.md) §18 (Budget Reporting API).

### Backend Budget Reallocation (RFC-017)

- **Module** `budget-reallocation` : transfert budgétaire traçable entre deux BudgetLine d’un même budget (sans modifier revisedAmount).
- **API** (permission `budgets.update` pour POST, `budgets.read` pour GET) :
  - `POST /api/budget-reallocations` — crée une réallocation (sourceLineId, targetLineId, amount, reason?), deux FinancialEvent REALLOCATION_DONE, et recalcule les deux lignes.
  - `GET /api/budget-reallocations` — liste avec filtres (budgetId, budgetLineId, dateFrom, dateTo), tri createdAt desc.
  - `GET /api/budget-reallocations/:id` — détail.
- **Règles** : même budget, même devise, lignes ACTIVE, budget non LOCKED/ARCHIVED, amount ≤ remainingAmount de la source. Audit : action `budget.reallocated`, resourceType `budget_reallocation`.

Détail : [docs/API.md](../API.md) §17 (Réallocations budgétaires).

### Backend Budget Import (RFC-018, RFC-021)

- **Module** `budget-import` : import de lignes budgétaires depuis fichiers Excel (`.xlsx`) ou CSV (`.csv`).
- **API** :
  - `POST /api/budget-imports/analyze` — analyse du fichier (fileToken, colonnes, échantillon, rowCount) ; permission `budgets.read`.
  - `POST /api/budget-imports/preview` — prévisualisation sans écriture (stats create/update/skip/error, previewRows, warnings, errors) ; permission `budgets.read`.
  - `POST /api/budget-imports/execute` — exécution transactionnelle (création/mise à jour BudgetLine, BudgetImportRowLink, job) ; option `defaultGeneralLedgerAccountId` ou compte client par défaut (code 999999) ; lignes importées en ENTERPRISE, sans splits ni compte analytique ; permission `budgets.update`.
  - CRUD `GET/POST/GET/:id/PATCH/DELETE /api/budget-import-mappings` — mappings sauvegardés (scopés client) ; `budgets.read` (GET), `budgets.update` (POST, PATCH, DELETE).
- **Règles** : fichier max 10 MB, 20 000 lignes ; seul l’uploader peut utiliser le fileToken pour preview/execute ; anti-doublon par externalId ou clé composite ; traçabilité via BudgetImportRowLink.

Détail : [docs/API.md](../API.md) §19 (Budget Data Import).

### Backend Budget Versioning (RFC-019, RFC-021)

- **Module** `budget-versioning` : gestion des versions de budgets (ensembles de versions, baseline, révisions, version active, comparaison).
- **API** :
  - `GET /api/budget-version-sets` — liste des ensembles de versions (exerciseId?, search?, offset?, limit?) ; permission `budgets.read`.
  - `GET /api/budget-version-sets/:id` — détail (métadonnées, baseline, active, liste des versions) ; permission `budgets.read`.
  - `POST /api/budgets/:id/create-baseline` — crée un version set et une baseline V1 par copie du budget (non versionné) ; permission `budgets.create`.
  - `POST /api/budgets/:id/create-revision` — crée une révision (body optionnel : label?, description?) ; permission `budgets.create`.
  - `POST /api/budgets/:id/activate-version` — marque la version comme active ; permission `budgets.update`.
  - `POST /api/budgets/:id/archive-version` — archive une version non active ; permission `budgets.update`.
  - `GET /api/budgets/:id/version-history` — historique des versions du set ; permission `budgets.read`.
  - `GET /api/budgets/:id/compare?targetBudgetId=...` — comparaison entre deux versions du même set ; permission `budgets.read`.
- **Règles** : duplication Budget / BudgetEnvelope / BudgetLine (codes stables, pas de clonage des allocations ni événements) ; copie des champs analytiques et des costCenterSplits via helper unique `cloneBudgetLineWithAnalytics` ; une seule baseline et une seule version active par set ; versions SUPERSEDED/ARCHIVED en lecture seule.

Détail : [docs/API.md](../API.md) §20 (Budget Versioning).

---

## 2. Ce qui n’est pas implémenté

- **Frontend** : aucune interface utilisateur pour les budgets dans cette phase. UI dimensions analytiques (référentiels, édition ligne avec portée et ventilation) hors périmètre immédiat (RFC-021).
- **Suppression physique** : pas d’endpoint DELETE sur la structure budgétaire (RFC-015-2).
- **Snapshots** : implémentés (RFC-015-3). **Réallocations** : backend implémenté (RFC-017) ; UI « Réallouer » hors périmètre MVP.
- **Axes analytiques, export Excel, workflow d’approbation** : hors périmètre du MVP. **Import Excel/CSV** : backend implémenté (RFC-018) ; UI d’import hors périmètre MVP. **Versioning** : backend implémenté (RFC-019) ; baseline, révisions, version active, comparaison ; UI versioning hors périmètre MVP.

---

## 3. Comment créer un budget (données de test ou dev)

### Option A : API Budget Management (recommandé)

1. S’assurer que le **module budgets** est activé pour le client et que l’utilisateur a les permissions `budgets.read`, `budgets.create`, `budgets.update`.
2. Appeler avec `Authorization: Bearer <accessToken>` et `X-Client-Id: <clientId>` :
   - `POST /api/budget-exercises` (name, startDate, endDate ; code optionnel)
   - `POST /api/budgets` (exerciseId, name, currency ; code optionnel)
   - `POST /api/budget-envelopes` (budgetId, name, type ; code optionnel)
   - `POST /api/budget-lines` (budgetId, envelopeId, name, expenseType, initialAmount, currency, **generalLedgerAccountId** ; code optionnel ; analyticalLedgerAccountId?, allocationScope?, costCenterSplits? si ANALYTICAL)

Voir [docs/API.md](../API.md) §15 et [docs/modules/analytical-dimensions-rfc021.md](analytical-dimensions-rfc021.md) pour les body complets.

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
- **RFC-017** : Budget Reallocation (transfert entre lignes)
- **RFC-018** : Budget Data Import
- **RFC-019** : Budget Versioning (baselines, révisions, version active, comparaison)
- **RFC-021** : Analytical Dimensions & Budget Allocation Splits (comptes comptables, compte analytique optionnel, centres de coûts, ventilation ENTERPRISE/ANALYTICAL)
- **Plan d’implémentation** : [docs/RFC/RFC-015-1B-implementation-plan.md](../RFC/RFC-015-1B-implementation-plan.md), [docs/RFC/RFC-019 — Budget Versioning — Plan implémentation.md](../RFC/RFC-019%20—%20Budget%20Versioning%20—%20Plan%20implémentation.md)
- **API** : [docs/API.md](../API.md) (§15 Structure budgétaire, §16 Noyau financier, §17 Réallocations budgétaires, §18 Budget Reporting, §19 Budget Data Import, §20 Budget Versioning ; référentiels et reporting RFC-021 dans API.md)
- **Spec dimensions analytiques** : [docs/modules/analytical-dimensions-rfc021.md](analytical-dimensions-rfc021.md)
- **Architecture** : [docs/ARCHITECTURE.md](../ARCHITECTURE.md) (§5.3 Noyau financier, §6.1 Modules)
