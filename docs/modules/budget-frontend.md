# Module Budget Frontend — Fondation (RFC-FE-001)

Ce document décrit la **fondation frontend** du module Budget dans Starium Orchestra : structure, conventions, et utilisation. Référence : [RFC-FE-001 — Budget Frontend Foundation](../RFC/RFC-FE-001%20—%20Budget%20Frontend%20Foundation.md).

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
│   ├── budget-management.api.ts   # Exercices, budgets, enveloppes, lignes (GET)
│   ├── budget-reporting.api.ts   # Summary, listes reporting
│   ├── budget-dashboard.api.ts   # Dashboard cockpit
│   ├── budget-snapshots.api.ts   # Stub (futures RFC)
│   ├── budget-reallocations.api.ts
│   ├── budget-imports.api.ts
│   └── budget-versioning.api.ts
├── hooks/                  # TanStack Query (useActiveClient + query keys)
│   ├── use-budget-exercises.ts
│   ├── use-budgets.ts
│   ├── use-budget-summary.ts
│   └── use-budget-dashboard.ts
├── components/             # Composants partagés budget
│   ├── budget-page-header.tsx
│   ├── budget-kpi-cards.tsx
│   ├── budget-toolbar.tsx
│   ├── budget-list-table.tsx
│   ├── budget-status-badge.tsx
│   ├── budget-empty-state.tsx
│   ├── budget-error-state.tsx
│   └── forms/              # Vide en fondation (futures RFC)
├── schemas/                # Zod (validation, pas de formulaires complets)
│   ├── create-budget.schema.ts
│   ├── create-envelope.schema.ts
│   ├── create-line.schema.ts
│   └── reallocate-budget.schema.ts
├── types/                  # Types alignés réponses API
│   ├── budget-management.types.ts
│   ├── budget-reporting.types.ts
│   ├── budget-dashboard.types.ts
│   └── placeholders (snapshots, reallocations, imports, versioning)
├── lib/
│   ├── budget-query-keys.ts   # Factory query keys (clientId obligatoire)
│   └── budget-formatters.ts   # formatAmount, formatPercent
└── constants/
    └── budget-routes.ts       # Helpers de routes (liens, navigation)
```

---

## 3. Query keys (tenant-aware)

**Règle** : toute query key budget inclut `clientId`. Aucune clé du type `["budgets"]` ou `["budget-detail", budgetId]`.

**Fichier** : `lib/budget-query-keys.ts`.

Exemples :

- `budgetQueryKeys.exercises(clientId, filters?)`
- `budgetQueryKeys.budgetDetail(clientId, budgetId)`
- `budgetQueryKeys.budgetSummary(clientId, budgetId)`
- `budgetQueryKeys.dashboard(clientId, params?)`
- Clés pour sous-domaines futurs : `snapshots`, `versions`, `reallocations`, `imports`

Les hooks utilisent `useActiveClient()` pour obtenir `clientId` et passent `enabled: !!clientId` à `useQuery`.

---

## 4. API modules

Tous les modules API reçoivent une fonction **authFetch** (retour de `useAuthenticatedFetch`) et appellent le backend. Le client global gère `Authorization` et `X-Client-Id`.

| Module | Rôle | Endpoints principaux |
|--------|------|----------------------|
| budget-management | Lectures structure (exercices, budgets, enveloppes, lignes) | GET `/api/budget-exercises`, `/api/budgets`, `/api/budget-envelopes`, `/api/budget-lines` |
| budget-reporting | KPI et listes reporting | GET `/api/budget-reporting/*` (summary, listBudgetsForExercise, listEnvelopesForBudget, getEnvelopeSummary, listLinesForEnvelope) |
| budget-dashboard | Vue cockpit | GET `/api/budget-dashboard` |
| budget-snapshots, -reallocations, -imports, -versioning | Stubs | À implémenter dans les RFC dédiées |

Les mutations (create/update) ne sont **pas** implémentées dans la fondation ; les schémas Zod préparent les futures RFC.

---

## 5. Hooks disponibles (fondation)

| Hook | Fichier | Usage |
|------|---------|--------|
| `useBudgetExercisesList(query?)` | use-budget-exercises | Liste paginée des exercices |
| `useBudgetExerciseSummary(exerciseId)` | use-budget-exercises | Détail d’un exercice |
| `useBudgetsList(query?)` | use-budgets | Liste des budgets (ex. par exerciseId) |
| `useBudgetDetail(budgetId)` | use-budgets | Détail d’un budget |
| `useBudgetSummary(budgetId)` | use-budget-summary | KPI budget (reporting) |
| `useBudgetDashboardQuery(params?)` | use-budget-dashboard | Données dashboard (query key tenant-aware) |

Pas de hooks pour les API stubs (snapshots, versioning, imports, reallocations) dans cette fondation.

---

## 6. Composants partagés

| Composant | Rôle |
|-----------|------|
| `BudgetPageHeader` | Wrapper PageHeader (titre, description, actions) |
| `BudgetKpiCards` | Grille de cartes KPI (`items: { label, value, trend? }[]`) |
| `BudgetToolbar` | Barre filtres/recherche/actions (TableToolbar) |
| `BudgetListTable` | Table générique (colonnes configurables, keyExtractor) — simple, pas un data-grid |
| `BudgetStatusBadge` | Badge de statut (DRAFT, ACTIVE, LOCKED, ARCHIVED, etc.) |
| `BudgetEmptyState` | État vide avec messages par défaut budget |
| `BudgetErrorState` | Erreur + retry avec messages par défaut budget |

Ils s’appuient sur les primitives : `PageHeader`, `Card`, `Table`, `Badge`, `EmptyState`, `ErrorState`, `LoadingState`.

---

## 7. Routes frontend (app/(protected)/budgets/)

| Route | Contenu |
|-------|---------|
| `/budgets` | Cockpit minimal : header, cartes d’accès (exercices, dashboard, imports), mini résumé |
| `/budgets/exercises` | Liste des exercices (table, états loading/error/empty) |
| `/budgets/exercises/[id]` | Détail exercice + liens vers budgets |
| `/budgets/[budgetId]` | Détail budget (KPI, liens lines/reporting/snapshots/versions/reallocations) |
| `/budgets/dashboard` | Dashboard détaillé (KPI, CAPEX/OPEX, tendance, top enveloppes/lignes) |
| `/budgets/[budgetId]/lines` | Squelette (à venir) |
| `/budgets/[budgetId]/reporting` | Squelette |
| `/budgets/[budgetId]/snapshots` | Squelette |
| `/budgets/[budgetId]/versions` | Squelette |
| `/budgets/[budgetId]/reallocations` | Squelette |
| `/budgets/imports` | Squelette |

Chaque page de données gère **loading**, **error**, **empty**, **success**.

---

## 8. Navigation

Dans `config/navigation.ts`, section Finance :

- **Budgets** : `href: "/budgets"`, `moduleCode: "budgets"`, `requiredPermissions: ["budgets.read"]`
- **Dashboard Budgets** : `href: "/budgets/dashboard"`

---

## 9. Constantes de routes

Fichier `constants/budget-routes.ts` : helpers pour les liens (éviter les chaînes en dur).

Exemples : `budgetExercisesList()`, `budgetExerciseDetail(id)`, `budgetDetail(budgetId)`, `budgetLines(budgetId)`, `budgetReporting(budgetId)`, `budgetDashboard()`, `budgetImports()`, etc.

---

## 10. Conventions

- **Aucun `fetch` direct** dans les composants : tout passe par les modules `api/` et `authFetch`.
- **Query keys** : toujours inclure `clientId` (factory dans `lib/budget-query-keys.ts`).
- **Types** : alignés sur les réponses API (voir `docs/API.md`).
- **Formulaires** : pas de formulaire complet dans la fondation ; schémas Zod prêts pour les RFC suivantes.
- **Composant table** : `BudgetListTable` reste simple (colonnes + render), pas un moteur de table générique.

---

## 11. Références

- [RFC-FE-001 — Budget Frontend Foundation](../RFC/RFC-FE-001%20—%20Budget%20Frontend%20Foundation.md)
- [Module Budget MVP (backend)](budget-mvp.md)
- [API.md](../API.md) §15 (Budget Management), §16 (Financial Core), §18 (Budget Reporting), §18.1 (Budget Dashboard)
- [FRONTEND_ARCHITECTURE.md](../FRONTEND_ARCHITECTURE.md) (architecture frontend globale)
