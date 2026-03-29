# Module Budget Frontend — Fondation (RFC-FE-001), listes (RFC-FE-003), explorateur (RFC-FE-004), cockpit (RFC-FE-002) et formulaires (RFC-FE-015)

Ce document décrit la **fondation frontend** du module Budget dans Starium Orchestra : structure, conventions, et utilisation. Références : [RFC-FE-001 — Budget Frontend Foundation](../RFC/RFC-FE-001%20—%20Budget%20Frontend%20Foundation.md), [RFC-FE-003 — Budget Exercises & Budgets List UI](../RFC/RFC-FE-003%20—%20Budget%20Exercises%20%26%20Budgets%20List%20UI.md), [RFC-FE-004 — Budget Envelopes & Lines Explorer UI](../RFC/RFC-FE-004%20—%20Budget%20Envelopes%20%26%20Lines%20Explorer%20UI.md), [RFC-FE-015 — Budget Forms UX](../RFC/RFC-FE-015%20—%20Budget%20Forms%20UX.md). **Vue cockpit** (`/budgets/dashboard`) : voir [Budget Cockpit — UI & intégration](budget-cockpit.md).

---

## 1. Objectif

Poser un socle frontend **feature-first** pour le domaine budget :

- structure de dossiers dédiée
- client API centralisé (aucun `fetch` direct dans les composants)
- query keys **tenant-aware** (toujours avec `clientId`)
- hooks TanStack Query pour la lecture
- composants partagés (header, KPI, toolbar, table, états vides/erreur)
- routes et pages de base + squelettes pour les sous-domaines

La logique métier reste **côté backend** ; le frontend ne fait pas de calculs budgétaires ni de règles de cohérence.

---

## 2. Structure (apps/web/src/features/budgets/)

```
features/budgets/
├── api/                    # Appels backend (authFetch)
│   ├── types.ts                      # ApiFormError (RFC-FE-015)
│   ├── budget-management.api.ts     # CRUD exercices, budgets, enveloppes, lignes (RFC-FE-015)
│   ├── general-ledger-accounts.api.ts  # Options comptes formulaire ligne (RFC-FE-015)
│   ├── get-budget-exercises.ts    # Liste exercices (page→offset, RFC-FE-003)
│   ├── get-budgets.ts             # Liste budgets (page→offset, RFC-FE-003)
│   ├── get-budget-exercise-options.ts  # Options pour filtre exercice (RFC-FE-003)
│   ├── budget-reporting.api.ts
│   ├── budget-dashboard.api.ts
│   ├── budget-snapshots.api.ts   # Stub
│   ├── budget-reallocations.api.ts
│   ├── budget-imports.api.ts
│   └── budget-versioning.api.ts
├── hooks/
│   ├── use-budget-exercises.ts
│   ├── use-budget-exercises-query.ts   # Liste paginée + filtres URL (RFC-FE-003)
│   ├── use-budgets.ts
│   ├── use-budgets-query.ts            # Liste paginée + filtres URL (RFC-FE-003)
│   ├── use-budget-exercise-options-query.ts  # Options filtre exercice (RFC-FE-003)
│   ├── use-budget-list-filters.ts      # Filtres URL exercices / budgets (RFC-FE-003)
│   ├── use-budget-summary.ts
│   ├── use-budget-dashboard.ts
│   ├── use-budget-envelopes.ts         # Toutes enveloppes d’un budget (RFC-FE-004, aussi utilisé par le formulaire de ligne)
│   ├── use-budget-lines.ts             # Toutes lignes d’un budget (RFC-FE-004)
│   ├── use-budget-explorer.ts          # Agrégat budget + enveloppes + lignes (RFC-FE-004)
│   └── use-budget-explorer-tree.ts     # tree + filteredTree mémoïsés (RFC-FE-004)
│   # Hooks formulaires (RFC-FE-015) : use-exercise-detail, use-create/update-*-exercise, use-create/update-budget, use-create/update-budget-envelope, use-create/update-budget-line, use-general-ledger-account-options, use-budget-options
├── components/
│   ├── budget-page-header.tsx
│   ├── budget-kpi-cards.tsx
│   ├── budget-toolbar.tsx
│   ├── budget-exercises-toolbar.tsx    # Recherche, status, limit, reset (RFC-FE-003)
│   ├── budgets-toolbar.tsx             # + filtre exercice (RFC-FE-003)
│   ├── budget-exercises-table.tsx      # Table liste exercices (RFC-FE-003)
│   ├── budgets-table.tsx               # Table liste budgets (RFC-FE-003)
│   ├── budget-list-table.tsx
│   ├── budget-lines-progress.tsx       # Barre Consommé % / Solde % (RFC-FE-004)
│   ├── budget-explorer-table.tsx      # Tableau hiérarchique enveloppes/lignes (RFC-FE-004)
│   ├── budget-explorer-row.tsx         # Ligne expandable enveloppe ou ligne budgétaire (RFC-FE-004)
│   ├── budget-status-badge.tsx
│   ├── budget-empty-state.tsx
│   ├── budget-error-state.tsx
│   ├── pagination-summary.tsx          # "1–20 sur N résultats" (RFC-FE-003)
│   ├── forms/                         # Formulaires create/edit (RFC-FE-015)
│   │   ├── budget-exercise-form.tsx
│   │   ├── budget-form.tsx
│   │   ├── budget-envelope-form.tsx
│   │   ├── budget-line-form.tsx
│   │   └── budget-form-actions.tsx
│   └── pages/                         # Pages conteneurs formulaires (RFC-FE-015)
│       ├── budget-exercise-form-page.tsx
│       ├── budget-form-page.tsx
│       ├── budget-envelope-form-page.tsx
│       └── budget-line-form-page.tsx
├── schemas/
│   ├── budget-exercise-form.schema.ts  # Zod exercice (RFC-FE-015)
│   ├── budget-line-form.schema.ts      # Zod ligne (RFC-FE-015)
│   ├── create-budget.schema.ts
│   ├── create-envelope.schema.ts
│   ├── create-line.schema.ts
│   └── reallocate-budget.schema.ts
├── mappers/
│   └── budget-form.mappers.ts         # API ↔ formulaire exercice, budget, enveloppe, ligne (RFC-FE-015)
├── types/
│   ├── budget-management.types.ts
│   ├── budget-list.types.ts            # ListResult, Summary, Params listes (RFC-FE-003)
│   ├── budget-explorer.types.ts        # ExplorerNode, BudgetExplorerFilters, BudgetExplorerData (RFC-FE-004)
│   ├── budget-reporting.types.ts
│   ├── budget-dashboard.types.ts
│   └── placeholders (snapshots, reallocations, imports, versioning)
├── lib/
│   ├── budget-query-keys.ts   # + budgetExercisesList, budgetsList, budgetEnvelopes(..., { full }), budgetLinesByBudget (RFC-FE-003, RFC-FE-004)
│   ├── budget-formatters.ts
│   ├── fetch-budget-explorer-data.ts   # fetchAllEnvelopesForBudget, fetchAllLinesForBudget (RFC-FE-004)
│   ├── build-budget-tree.ts            # Arbre enveloppes/lignes, orphelins (RFC-FE-004)
│   └── filter-budget-tree.ts           # Filtrage côté client (RFC-FE-004)
└── constants/
    ├── budget-routes.ts       # + formulaires : budgetExerciseNew/Edit, budgetNew/Edit, budgetEnvelopeNew/Edit, budgetLineNew/Edit (RFC-FE-015)
    └── budget-filters.ts      # DEFAULT_PAGE, DEFAULT_LIMIT, options statut (RFC-FE-003)
```

---

## 3. Query keys (tenant-aware)

**Règle** : toute query key budget inclut `clientId`. Aucune clé du type `["budgets"]` ou `["budget-detail", budgetId]`.

**Fichier** : `lib/budget-query-keys.ts`.

Exemples :

- `budgetQueryKeys.exercises(clientId, filters?)`
- `budgetQueryKeys.budgetExercisesList(clientId, filters?)` — listes paginées (RFC-FE-003)
- `budgetQueryKeys.budgetsList(clientId, filters?)` — listes paginées (RFC-FE-003)
- `budgetQueryKeys.budgetExerciseOptions(clientId)` — options filtre exercice (RFC-FE-003)
- `budgetQueryKeys.exerciseDetail(clientId, id)` — détail exercice pour formulaire edit (RFC-FE-015)
- `budgetQueryKeys.generalLedgerAccountOptions(clientId)` — options comptes formulaire ligne (RFC-FE-015)
- `budgetQueryKeys.budgetDetail(clientId, budgetId)`
- `budgetQueryKeys.budgetEnvelopes(clientId, budgetId, options?)` — `options.full === true` pour l’explorer (toutes enveloppes) (RFC-FE-004)
- `budgetQueryKeys.budgetLinesByBudget(clientId, budgetId)` — toutes lignes du budget, sans filtres API (RFC-FE-004)
- `budgetQueryKeys.budgetSummary(clientId, budgetId)`
- `budgetQueryKeys.dashboard(clientId, params?)`
- Clés pour sous-domaines futurs : `snapshots`, `versions`, `reallocations`, `imports`

Les hooks utilisent `useActiveClient()` pour obtenir `clientId` et passent `enabled: !!clientId` à `useQuery`.

---

## 4. API modules

Tous les modules API reçoivent une fonction **authFetch** (retour de `useAuthenticatedFetch`) et appellent le backend. Le client global gère `Authorization` et `X-Client-Id`.

| Module | Rôle | Endpoints principaux |
|--------|------|----------------------|
| budget-management | CRUD structure (exercices, budgets, enveloppes, lignes) | GET + POST/PATCH (RFC-FE-015) ; `parseApiFormError` + `ApiFormError` pour erreurs formulaires |
| general-ledger-accounts | Options comptes comptables (formulaire ligne) | GET `/api/general-ledger-accounts` (RFC-FE-015) |
| budget-reporting | KPI et listes reporting | GET `/api/budget-reporting/*` (summary, listBudgetsForExercise, listEnvelopesForBudget, getEnvelopeSummary, listLinesForEnvelope) |
| budget-dashboard | Vue cockpit | GET `/api/budget-dashboard` |
| budget-snapshots, -reallocations, -imports, -versioning | Stubs | À implémenter dans les RFC dédiées |

---

## 5. Hooks disponibles (fondation + RFC-FE-003 + RFC-FE-004)

| Hook | Fichier | Usage |
|------|---------|--------|
| `useBudgetExercisesList(query?)` | use-budget-exercises | Liste exercices (offset/limit brut) |
| `useBudgetExerciseSummary(exerciseId)` | use-budget-exercises | Détail d’un exercice |
| `useBudgetsList(query?)` | use-budgets | Liste budgets (offset/limit brut) |
| `useBudgetDetail(budgetId)` | use-budgets | Détail d’un budget |
| `useBudgetSummary(budgetId)` | use-budget-summary | KPI budget (reporting) |
| `useBudgetDashboardQuery(params?)` | use-budget-dashboard | Données dashboard |
| `useBudgetExercisesQuery(filters)` | use-budget-exercises-query | Liste exercices paginée, filtres URL (RFC-FE-003) |
| `useBudgetsQuery(filters)` | use-budgets-query | Liste budgets paginée, filtres URL (RFC-FE-003) |
| `useBudgetExerciseOptionsQuery()` | use-budget-exercise-options-query | Options filtre exercice (RFC-FE-003) |
| `useBudgetExercisesListFilters()` / `useBudgetsListFilters()` | use-budget-list-filters | Filtres dans l'URL (RFC-FE-003) |
| `useBudgetEnvelopesAll(budgetId)` | use-budget-envelopes | Toutes enveloppes du budget, pagination en boucle (RFC-FE-004, réutilisé par le formulaire de ligne pour le select d’enveloppe) |
| `useBudgetLinesByBudget(budgetId)` | use-budget-lines | Toutes lignes du budget, sans filtres API (RFC-FE-004) |
| `useBudgetExplorer(budgetId)` | use-budget-explorer | Agrégat budget + enveloppes + lignes, états (RFC-FE-004) |
| `useBudgetExplorerTree(budget, envelopes, lines, filters)` | use-budget-explorer-tree | tree + filteredTree mémoïsés (RFC-FE-004) |
| **RFC-FE-015 (formulaires)** | | |
| `useExerciseDetail(id)` | use-exercise-detail | Détail exercice pour formulaire edit |
| `useCreateBudgetExercise` / `useUpdateBudgetExercise(id)` | use-create/update-budget-exercise | Mutations exercice |
| `useCreateBudget` / `useUpdateBudget(budgetId)` | use-create/update-budget | Mutations budget |
| `useCreateBudgetEnvelope` / `useUpdateBudgetEnvelope(envelopeId, budgetId)` | use-create/update-budget-envelope | Mutations enveloppe |
| `useCreateBudgetLine` / `useUpdateBudgetLine(lineId, budgetId)` | use-create/update-budget-line | Mutations ligne |
| `useGeneralLedgerAccountOptions()` | use-general-ledger-account-options | Options comptes formulaire ligne |
| `useBudgetOptions()` | use-budget-options | Options exercice/budget pour formulaires |

Pas de hooks pour les API stubs (snapshots, versioning, imports, reallocations) dans cette fondation.

---

## 6. Composants partagés

| Composant | Rôle |
|-----------|------|
| `BudgetPageHeader` | Wrapper PageHeader (titre, description, actions) |
| `BudgetKpiCards` | Grille de cartes KPI (`items: { label, value, trend? }[]`) |
| `BudgetToolbar` | Barre filtres/recherche/actions (TableToolbar) |
| `BudgetExercisesToolbar` | Recherche (debounce), status, limit, reset — sync URL (RFC-FE-003) |
| `BudgetsToolbar` | Idem + filtre exercice (RFC-FE-003) |
| `BudgetListTable` | Table générique (colonnes configurables, keyExtractor) |
| `BudgetExercisesTable` | Table liste exercices (RFC-FE-003) |
| `BudgetsTable` | Table liste budgets (RFC-FE-003) |
| `BudgetLinesProgress` | Barre Consommé % / Solde % pour une ligne budgétaire (RFC-FE-004) |
| `BudgetExplorerTable` | Tableau hiérarchique enveloppes/lignes, expand/collapse (RFC-FE-004) |
| `BudgetExplorerRow` | Ligne enveloppe ou ligne budgétaire (indentation, chevron, aria) ; **lecture seule** sur les montants — clic sur le **nom** → drawer intelligence ([RFC-FE-ADD-006](../RFC/RFC-FE-ADD-006%20%E2%80%94%20Budget%20Line%20Intelligence%20Drawer%20UI.md)) ; pas d’édition inline ni d’UI planning dans la ligne |
| `BudgetPilotageSection` / `BudgetTable` | Onglet **Pilotage** sur `/budgets/[budgetId]` : planning mensuel / atterrissage / forecast ([RFC-024](../RFC/RFC-024%20%E2%80%94%20Budget%20UI.md), [RFC-023](../RFC/RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md)) |
| `BudgetLineIntelligenceDrawer` | Drawer bas (onglets ligne) — [RFC-FE-ADD-006](../RFC/RFC-FE-ADD-006%20%E2%80%94%20Budget%20Line%20Intelligence%20Drawer%20UI.md) |
| `PaginationSummary` | "1–20 sur N résultats" (RFC-FE-003) |
| `BudgetStatusBadge` | Badge de statut (DRAFT, ACTIVE, LOCKED, ARCHIVED, etc.) |
| `BudgetEmptyState` | État vide avec messages par défaut budget |
| `BudgetErrorState` | Erreur + retry avec messages par défaut budget |

| **Formulaires (RFC-FE-015)** | |
| `BudgetExerciseForm` / `BudgetForm` / `BudgetEnvelopeForm` / `BudgetLineForm` | Formulaires RHF + Zod (create/edit), `submitError` ApiFormError, `cancelHref`, `disableSubmit` (ligne si options manquantes) |
| `BudgetFormActions` | Annuler (Link `cancelHref`) + Enregistrer ; pas de `router.back()` |
| `BudgetExerciseFormPage` / `BudgetFormPage` / `BudgetEnvelopeFormPage` / `BudgetLineFormPage` | Pages conteneurs : chargement, mutation, defaultValues, redirection après succès |

Ils s’appuient sur les primitives : `PageHeader`, `Card`, `Table`, `Badge`, `EmptyState`, `ErrorState`, `LoadingState`.

---

## 7. Routes frontend (app/(protected)/budgets/)

| Route | Contenu |
|-------|---------|
| `/budgets` | **Liste principale des budgets** (RFC-FE-003) : table paginée, filtres, sync URL |
| `/budgets/exercises` | **Liste des exercices budgétaires** (RFC-FE-003) : table paginée, filtres, sync URL |
| `/budgets/exercises/[id]` | Détail exercice + liens vers budgets |
| `/budgets/exercises/new` | **Création exercice** (RFC-FE-015) |
| `/budgets/exercises/[id]/edit` | **Édition exercice** (RFC-FE-015) |
| `/budgets/new` | **Création budget** (RFC-FE-015) |
| `/budgets/[budgetId]/edit` | **Édition budget** (RFC-FE-015) |
| `/budgets/[budgetId]/envelopes/new` | **Création enveloppe** (RFC-FE-015) |
| `/budget-envelopes/[envelopeId]/edit` | **Édition enveloppe** (RFC-FE-015) |
| `/budgets/[budgetId]/lines/new` | **Création ligne budgétaire** (RFC-FE-015) |
| `/budget-lines/[lineId]/edit` | **Édition ligne budgétaire** (RFC-FE-015) |
| `/budgets/[budgetId]` | **Cockpit budget (RFC-FE-004)** : KPI, tableau hiérarchique enveloppes/lignes (expand/collapse), filtres recherche/type/OPEX-CAPEX, états loading/error/empty global/empty filtré, liens lines/reporting/snapshots/versions/reallocations |
| `/budgets/dashboard` | **Budget Cockpit** (RFC-FE-002) : KPI, alertes, analytics, tableaux — voir [budget-cockpit.md](budget-cockpit.md) |
| `/budgets/[budgetId]/lines` | Liste lignes (détail) |
| `/budgets/[budgetId]/reporting` | Squelette |
| `/budgets/[budgetId]/snapshots` | Squelette |
| `/budgets/[budgetId]/versions` | Squelette |
| `/budgets/[budgetId]/reallocations` | Squelette |
| `/budgets/imports` | Squelette |
| `/budgets/configuration` | Page de configuration budget : cartes vers **Exercices** (`/budgets/exercises`) et **Imports** (`/budgets/imports`) |

Chaque page de données gère **loading**, **error**, **empty**, **success**. Les listes `/budgets` et `/budgets/exercises` reflètent filtres et pagination dans l'URL.

---

## 8. Navigation

Dans `config/navigation.ts` et `components/shell/sidebar.tsx`, section Finance (dropdown Budgets) :

- **Dashboard** : `href: "/budgets/dashboard"` — cockpit budgétaire
- **Budget** : `href: "/budgets"` — liste principale des budgets (page par défaut du module)
- **Configuration** : `href: "/budgets/configuration"` — accès aux Exercices et Imports

`moduleCode: "budgets"`, `requiredPermissions: ["budgets.read"]`.

---

## 9. Constantes de routes

Fichier `constants/budget-routes.ts` : helpers pour les liens (éviter les chaînes en dur).

Exemples : `budgetList()` → `/budgets`, `budgetListWithExercise(exerciseId)` → `/budgets?exerciseId=<id>` (RFC-FE-003), `budgetExercisesList()`, `budgetExerciseDetail(id)`, `budgetDetail(budgetId)`, `budgetLines(budgetId)`, `budgetReporting(budgetId)`, `budgetDashboard()`, `budgetDashboardForBudget(exerciseId, budgetId)` → `/budgets/dashboard?exerciseId=…&budgetId=…`, `budgetImports()`, etc.

---

## 10. Conventions

- **Aucun `fetch` direct** dans les composants : tout passe par les modules `api/` et `authFetch`.
- **Query keys** : toujours inclure `clientId` (factory dans `lib/budget-query-keys.ts`).
- **Types** : alignés sur les réponses API (voir `docs/API.md`).
- **Formulaires** : pas de formulaire complet dans la fondation ; schémas Zod prêts pour les RFC suivantes.
- **Composant table** : `BudgetListTable` reste simple (colonnes + render), pas un moteur de table générique.

---

## 11. Références

- [Budget Cockpit — UI & intégration](budget-cockpit.md) — `/budgets/dashboard`, HT/TTC, tableaux (dont drill-down ligne via `BudgetLineIntelligenceDrawer`), fichiers `features/budgets/dashboard/`
- [RFC-FE-001 — Budget Frontend Foundation](../RFC/RFC-FE-001%20—%20Budget%20Frontend%20Foundation.md)
- [RFC-FE-003 — Budget Exercises & Budgets List UI](../RFC/RFC-FE-003%20—%20Budget%20Exercises%20%26%20Budgets%20List%20UI.md) — listes paginées, filtres, sync URL
- [RFC-FE-003 — Conformité](../RFC/RFC-FE-003-conformite.md)
- [RFC-FE-004 — Budget Envelopes & Lines Explorer UI](../RFC/RFC-FE-004%20—%20Budget%20Envelopes%20%26%20Lines%20Explorer%20UI.md) — page cockpit `/budgets/[budgetId]`, tableau hiérarchique, tree/filteredTree, pagination complète
- [Module Budget MVP (backend)](budget-mvp.md)
- [API.md](../API.md) §15 (Budget Management), §16 (Financial Core), §18 (Budget Reporting), §18.1 (Budget Dashboard)
- [FRONTEND_ARCHITECTURE.md](../FRONTEND_ARCHITECTURE.md) (architecture frontend globale)
