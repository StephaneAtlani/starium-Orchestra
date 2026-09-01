# Module Budget Frontend — Fondation (RFC-FE-001), listes (RFC-FE-003), portefeuille (RFC-FE-BUD-031), explorateur (RFC-FE-004), cockpit (RFC-FE-002), formulaires (RFC-FE-015), atterrissage (RFC-BUD-040) et comparaison (RFC-FE-BUD-030)

Ce document décrit la **fondation frontend** du module Budget dans Starium Orchestra : structure, conventions, et utilisation. Références : [RFC-FE-001 — Budget Frontend Foundation](../RFC/RFC-FE-001%20—%20Budget%20Frontend%20Foundation.md), [RFC-FE-003 — Budget Exercises & Budgets List UI](../RFC/RFC-FE-003%20—%20Budget%20Exercises%20%26%20Budgets%20List%20UI.md), [RFC-FE-BUD-031 — Portefeuille budgets UI (refonte mockup)](../RFC/RFC-FE-BUD-031%20%E2%80%94%20Portefeuille%20budgets%20UI%20(refonte%20mockup).md), [RFC-FE-004 — Budget Envelopes & Lines Explorer UI](../RFC/RFC-FE-004%20—%20Budget%20Envelopes%20%26%20Lines%20Explorer%20UI.md), [RFC-FE-015 — Budget Forms UX](../RFC/RFC-FE-015%20—%20Budget%20Forms%20UX.md), [RFC-FE-BUD-030 — Forecast & Comparaison budgétaire UI](../RFC/RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md). **Vue cockpit** (`/budgets/dashboard`) : voir [Budget Cockpit — UI & intégration](budget-cockpit.md).

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

### Glossaire RFC-BUD-041 (ne pas confondre)

| Terme | Sens | Où |
|-------|------|-----|
| **Prévisionnel** | Onglet plan annuel 12 mois (`?onglet=previsionnel`) | Grille explorateur |
| **Atterrissage** | KPI de projection fin d’exercice | Bandeau KPI, encart lecture seule |
| **Prévision d’atterrissage (PA)** | Rituel CODIR (figer, comparer, valider, activer) | CTA header → `?onglet=pa` (**hors** tablist des 6 onglets) |

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
│   ├── budget-landing.api.ts       # RFC-BUD-040 — atterrissage (canonique)
│   ├── budget-landing-forecast.api.ts  # RFC-BUD-041 — rituel PA (GET/validate/apply + submit/activate)
│   ├── budget-dashboard.api.ts
│   ├── budget-forecast.api.ts        # RFC-BUD-040 — wrapper déprécié → landing
│   ├── budget-comparison.api.ts
│   ├── budget-snapshots.api.ts   # listBudgetSnapshots, détail (RFC-033 / RFC-FE-BUD-030)
│   ├── budget-snapshot-occasion-types.api.ts
│   ├── platform-budget-snapshot-occasion-types.api.ts
│   ├── budget-reallocations.api.ts
│   ├── budget-imports.api.ts
│   └── budget-versioning.api.ts  # getVersionHistory (RFC-FE-BUD-030)
├── hooks/
│   ├── use-budget-exercises.ts
│   ├── use-budget-exercises-query.ts   # Liste paginée + filtres URL (RFC-FE-003)
│   ├── use-budgets.ts
│   ├── use-budgets-query.ts            # Liste paginée + filtres URL (RFC-FE-003)
│   ├── use-budget-exercise-options-query.ts  # Options filtre exercice (RFC-FE-003 / RFC-FE-BUD-031)
│   ├── use-budget-list-filters.ts      # Filtres URL exercices / budgets (RFC-FE-003 + view RFC-FE-BUD-031)
│   ├── use-exercise-reporting-summary-query.ts   # KPI consolidation exercice (RFC-FE-BUD-031)
│   ├── use-exercise-budgets-reporting-query.ts   # Liste budgets + KPI par exercice (RFC-FE-BUD-031)
│   ├── use-budget-summary.ts
│   ├── use-envelope-summary.ts        # RFC-BUD-040 — KPI enveloppe (reporting)
│   ├── use-budget-landing.ts          # RFC-BUD-040
│   ├── use-envelope-landing.ts
│   ├── use-envelope-landing-lines.ts
│   ├── use-budget-dashboard.ts
│   ├── use-budget-envelopes.ts         # Toutes enveloppes d’un budget (RFC-FE-004, aussi utilisé par le formulaire de ligne)
│   ├── use-budget-lines.ts             # Toutes lignes d’un budget (RFC-FE-004)
│   ├── use-budget-explorer.ts          # Agrégat budget + enveloppes + lignes (RFC-FE-004)
│   └── use-budget-explorer-tree.ts     # tree + filteredTree mémoïsés (RFC-FE-004)
│   # Hooks formulaires (RFC-FE-015) : use-exercise-detail, use-create/update-*-exercise, use-create/update-budget, use-create/update-budget-envelope, use-create/update-budget-line, use-general-ledger-account-options, use-budget-options
├── forecast/                         # RFC-FE-BUD-030 — KPI, tables, comparaison, sélecteurs
│   ├── components/                   # ForecastKpiCards, ForecastTable, ComparisonTable, ForecastStatusBadge, BudgetComparisonSelector
│   ├── hooks/                        # useBudgetForecast, useEnvelopeForecast, useEnvelopeForecastLines, useBudgetComparison, useBudgetSnapshotsForSelect, useSnapshotPairComparison, useMultiSnapshotVsLiveComparison ; `use-budget-version-history.ts` existe (API version-history) mais l’onglet « deux révisions » a été retiré du panneau comparaison embarqué |
│   └── budget-reporting-forecast-page.tsx
├── components/
│   ├── budget-page-header.tsx
│   ├── budget-toolbar.tsx
│   ├── budget-exercises-toolbar.tsx    # Recherche, status, limit, reset (RFC-FE-003)
│   ├── budgets-toolbar.tsx             # Filtres + toggle Cartes/Tableau (RFC-FE-003 / RFC-FE-BUD-031)
│   ├── budgets-portfolio-kpi.tsx       # Bandeau KPI consolidation exercice (RFC-FE-BUD-031)
│   ├── budgets-portfolio-cards.tsx     # Grille cartes portefeuille (RFC-FE-BUD-031)
│   ├── budget-exercises-table.tsx      # Table liste exercices (RFC-FE-003)
│   ├── budgets-table.tsx               # Table portefeuille budgets + KPI (RFC-FE-BUD-031)
│   ├── budget-list-table.tsx
│   ├── budget-lines-progress.tsx       # Barre Consommé % / Solde % (RFC-FE-004)
│   ├── budget-explorer-table.tsx      # Tableau hiérarchique enveloppes/lignes — Statut + Libellé à gauche (RFC-FE-004)
│   ├── budget-explorer-row.tsx         # Ligne expandable enveloppe ou ligne budgétaire (RFC-FE-004)
│   ├── budget-status-badge.tsx
│   ├── budget-empty-state.tsx
│   ├── budget-error-state.tsx
│   ├── pagination-summary.tsx          # "1–20 sur N résultats" (RFC-FE-003)
│   ├── budget-detail/                 # Fiche cockpit (RFC-FE-BUD-032) — barrel index.ts
│   │   ├── budget-detail-header.tsx        # PageHeader + barre d’outils secondaire
│   │   ├── budget-detail-kpi-strip.tsx     # Bande 6 KPI + Tout/CAPEX/OPEX + HT/TTC
│   │   ├── budget-detail-alerts-banner.tsx # Alertes API (aria-live)
│   │   ├── budget-detail-tabs.tsx          # WorkspaceTabBar — 6 onglets DS
│   │   ├── budget-detail-workspace.tsx     # Switch contenu + toolbar contextuelle
│   │   ├── budget-reallocations-panel.tsx  # Journal + CTA création (partagé avec /reallocations)
│   │   ├── budget-comparisons-panel.tsx    # Versions figées + comparaison embarquée
│   │   └── budget-historique-panel.tsx     # Frise des décisions + import
│   ├── budget-detail-modals/          # Saisie de dépense (formulaire unique, RFC-FE-BUD-032)
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
│   ├── budget-detail-tabs.types.ts     # BudgetDetailTabId, BUDGET_DETAIL_TABS, budgetDetailTabToExplorerMode (RFC-FE-BUD-032)
│   ├── budget-reporting.types.ts
│   ├── budget-dashboard.types.ts
│   ├── budget-forecast.types.ts
│   ├── budget-snapshots-list.types.ts
│   ├── budget-version-history.types.ts
│   └── placeholders (reallocations, imports — autres stubs éventuels)
├── lib/
│   ├── budget-query-keys.ts   # + exerciseSummary, exerciseBudgetsWithKpi (RFC-FE-BUD-031), budgetExercisesList, budgetsList, …
│   ├── budget-portfolio-format.ts   # format montant/taux, libellé statut, alerte carte (RFC-FE-BUD-031)
│   ├── budget-portfolio-export.ts   # export CSV portefeuille (RFC-FE-BUD-031)
│   ├── budget-display-labels.ts     # libellés financiers uniques + masquage des codes techniques (RFC-FE-BUD-032)
│   ├── budget-detail-export.ts      # export CSV de la fiche, côté client (RFC-FE-BUD-032)
│   ├── build-realized-vs-planned-chart.ts  # 12 mois Prévu / Réalisé (Vue d’ensemble)
│   ├── budget-formatters.ts   # + formatCurrency (DAF, RFC-FE-BUD-030)
│   ├── fetch-budget-explorer-data.ts   # fetchAllEnvelopesForBudget, fetchAllLinesForBudget (RFC-FE-004)
│   ├── build-budget-tree.ts            # Arbre enveloppes/lignes, orphelins (RFC-FE-004)
│   └── filter-budget-tree.ts           # Filtrage côté client (RFC-FE-004)
└── constants/
    ├── budget-routes.ts       # + formulaires : budgetExerciseNew/Edit, budgetNew/Edit, budgetEnvelopeNew/Edit, budgetLineNew/Edit (RFC-FE-015)
    ├── budget-filters.ts      # DEFAULT_PAGE, DEFAULT_LIMIT, options statut (RFC-FE-003)
    ├── budget-workflow-status.ts       # libellés `BudgetStatus` (liste)
    └── budget-status-transitions.ts    # transitions autorisées (aligné API) + options select en édition budget
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
- `budgetQueryKeys.exerciseSummary(clientId, exerciseId)` — KPI consolidation exercice (RFC-FE-BUD-031)
- `budgetQueryKeys.exerciseBudgetsWithKpi(clientId, exerciseId, query?)` — liste budgets reporting (RFC-FE-BUD-031)
- `budgetQueryKeys.exerciseDetail(clientId, id)` — détail exercice pour formulaire edit (RFC-FE-015)
- `budgetQueryKeys.generalLedgerAccountOptions(clientId)` — options comptes formulaire ligne (RFC-FE-015)
- `budgetQueryKeys.budgetDetail(clientId, budgetId)`
- `budgetQueryKeys.budgetEnvelopes(clientId, budgetId, options?)` — `options.full === true` pour l’explorer (toutes enveloppes) (RFC-FE-004)
- `budgetQueryKeys.budgetLinesByBudget(clientId, budgetId)` — toutes lignes du budget, sans filtres API (RFC-FE-004)
- `budgetQueryKeys.budgetSummary(clientId, budgetId)`
- `budgetQueryKeys.dashboard(clientId, params?)`
- `budgetQueryKeys.budgetForecast(clientId, budgetId)` — RFC-FE-BUD-030
- `budgetQueryKeys.envelopeForecast(clientId, envelopeId)` / `envelopeForecastLines(clientId, envelopeId, { limit, offset })`
- `budgetQueryKeys.budgetComparison(clientId, budgetId, compareTo, targetId?)`
- `budgetQueryKeys.budgetSnapshotsList(clientId, budgetId, params?)`, `budgetSnapshotOccasionTypesMerged(clientId)`, `budgetVersionHistory(clientId, budgetId)` (version-history API, hors panneau comparaison simplifié)
- Clés pour sous-domaines : `snapshots`, `versions`, `reallocations`, `imports` (autres écrans)

Les hooks utilisent `useActiveClient()` pour obtenir `clientId` et passent `enabled: !!clientId` à `useQuery`.

---

## 4. API modules

Tous les modules API reçoivent une fonction **authFetch** (retour de `useAuthenticatedFetch`) et appellent le backend. Le client global gère `Authorization` et `X-Client-Id`.

| Module | Rôle | Endpoints principaux |
|--------|------|----------------------|
| budget-management | CRUD structure (exercices, budgets, enveloppes, lignes) | GET + POST/PATCH (RFC-FE-015) ; `parseApiFormError` + `ApiFormError` pour erreurs formulaires |
| general-ledger-accounts | Options comptes comptables (formulaire ligne) | GET `/api/general-ledger-accounts` (RFC-FE-015) |
| budget-reporting | KPI et listes reporting | GET `/api/budget-reporting/*` (summary, listBudgetsForExercise, listEnvelopesForBudget, getEnvelopeSummary, listLinesForEnvelope) |
| budget-landing | Atterrissage (RFC-BUD-040) | GET `/api/budget-landing/*`, `GET /api/budget-lines/:id/landing` |
| budget-dashboard | Vue cockpit | GET `/api/budget-dashboard` |
| budget-forecast / budget-comparison | Forecast **déprécié** (proxy landing) & comparaison | GET `/api/budget-forecast/*` (`Deprecation: true`), `/api/budget-comparisons/*` — [RFC-BUD-040](../RFC/RFC-BUD-040%20%E2%80%94%20Unification%20atterrissage%2C%20pr%C3%A9vision%20et%20forecast.md), [RFC-FE-BUD-030](../RFC/RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md) |
| budget-snapshots | Liste snapshots (sélecteur comparaison) | GET `/api/budget-snapshots?budgetId=` — RFC-FE-BUD-030 |
| budget-versioning | Historique de versions | GET `/api/budgets/:id/version-history` — RFC-FE-BUD-030 |
| budget-reallocations, -imports | Stubs / partiels | RFC dédiées |

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
| `useBudgetExerciseOptionsQuery(options?)` | use-budget-exercise-options-query | Options filtre exercice ; `enabled` optionnel (RFC-FE-003 / RFC-FE-BUD-031) |
| `useExerciseReportingSummaryQuery(exerciseId, options?)` | use-exercise-reporting-summary-query | KPI consolidation exercice (RFC-FE-BUD-031) |
| `useExerciseBudgetsReportingQuery(exerciseId, query?, options?)` | use-exercise-budgets-reporting-query | Liste budgets + KPI par exercice (RFC-FE-BUD-031) |
| `useBudgetExercisesListFilters()` / `useBudgetsListFilters()` | use-budget-list-filters | Filtres dans l'URL : search, status, exerciseId, **view** (`cards` \| `table`), page, limit |
| `useBudgetEnvelopesAll(budgetId)` | use-budget-envelopes | Toutes enveloppes du budget, pagination en boucle (RFC-FE-004, réutilisé par le formulaire de ligne pour le select d’enveloppe) |
| `useBudgetLinesByBudget(budgetId)` | use-budget-lines | Toutes lignes du budget, sans filtres API (RFC-FE-004) |
| `useBudgetExplorer(budgetId)` | use-budget-explorer | Agrégat budget + enveloppes + lignes, états (RFC-FE-004) |
| `useBudgetExplorerTree(budget, envelopes, lines, filters)` | use-budget-explorer-tree | tree + filteredTree mémoïsés (RFC-FE-004) |
| **RFC-BUD-040 (atterrissage)** | | |
| `useBudgetLanding` | use-budget-landing | Agrégat atterrissage budget |
| `useEnvelopeLanding` / `useEnvelopeLandingLines` | use-envelope-landing* | Agrégat + lignes enveloppe |
| `useEnvelopeSummary` | use-envelope-summary | KPI enveloppe via reporting (bandeau synthèse) |
| `useBudgetForecast` / `useEnvelopeForecast` / `useEnvelopeForecastLines` | forecast/hooks | **Alias dépréciés** → hooks landing ci-dessus |
| **RFC-FE-BUD-030 (comparaison)** | | |
| `useBudgetComparison` | forecast/hooks | Comparaison `compareBudget` — `compareTo` UI : `baseline` \| `snapshot` ; `enabled` si `snapshot` sans `targetId` → false |
| `useBudgetSnapshotsForSelect` | forecast/hooks | Liste versions figées libellées pour sélecteurs et mode multi-colonnes |
| `useSnapshotPairComparison` / `useMultiSnapshotVsLiveComparison` | forecast/hooks | Onglets « deux versions figées » et « plusieurs versions figées » |
| **RFC-FE-015 (formulaires)** | | |
| `useExerciseDetail(id)` | use-exercise-detail | Détail exercice pour formulaire edit |
| `useCreateBudgetExercise` / `useUpdateBudgetExercise(id)` | use-create/update-budget-exercise | Mutations exercice |
| `useCreateBudget` / `useUpdateBudget(budgetId)` | use-create/update-budget | Mutations budget |
| `useCreateBudgetEnvelope` / `useUpdateBudgetEnvelope(envelopeId, budgetId)` | use-create/update-budget-envelope | Mutations enveloppe |
| `useCreateBudgetLine` / `useUpdateBudgetLine(lineId, budgetId)` | use-create/update-budget-line | Mutations ligne |
| `useGeneralLedgerAccountOptions()` | use-general-ledger-account-options | Options comptes formulaire ligne |
| `useBudgetOptions()` | use-budget-options | Options exercice/budget pour formulaires |

Les hooks **forecast** (RFC-FE-BUD-030) vivent sous `forecast/hooks/`. Les autres stubs (imports, réallocations UI complètes, etc.) suivent les RFC dédiées.

---

## 6. Composants partagés

| Composant | Rôle |
|-----------|------|
| `BudgetPageHeader` | Wrapper PageHeader (titre, description, actions) |
| `BudgetToolbar` | Barre filtres/recherche/actions (TableToolbar) |
| `BudgetExercisesToolbar` | Recherche (debounce), status, limit, reset — sync URL (RFC-FE-003) |
| `BudgetsToolbar` | Recherche, exercice (obligatoire), statut, toggle Cartes/Tableau, reset — sync URL (RFC-FE-003 / RFC-FE-BUD-031) |
| `BudgetsPortfolioKpi` | Bandeau 5 KPI consolidation exercice : Alloué, Engagé, Consommé, Reste, Prévision (`PortfolioKpiRow`) — RFC-FE-BUD-031 |
| `BudgetsPortfolioCards` | Grille cartes cliquables → `/budgets/[id]` (`PortfolioEntityCard`) — RFC-FE-BUD-031 |
| `BudgetListTable` | Table générique (colonnes configurables, keyExtractor) |
| `BudgetExercisesTable` | Table liste exercices (RFC-FE-003) |
| `BudgetsTable` | Table portefeuille budgets avec tons et barres d’exécution (RFC-FE-BUD-031) |
| `BudgetLinesProgress` | Barre Consommé % / Solde % pour une ligne budgétaire (RFC-FE-004) |
| `BudgetExplorerTable` | Tableau hiérarchique enveloppes/lignes, expand/collapse (RFC-FE-004) |
| `BudgetExplorerRow` | Ligne enveloppe ou ligne budgétaire ; **Statut** (étroit : badge ligne ou « — » enveloppe) puis **Libellé** (indentation, chevron, aria) ; **lecture seule** sur les montants — clic sur le **libellé** (nom) → drawer intelligence ([RFC-FE-ADD-006](../RFC/RFC-FE-ADD-006%20%E2%80%94%20Budget%20Line%20Intelligence%20Drawer%20UI.md)) ; pas d’édition inline ni d’UI planning dans la ligne |
| `BudgetPilotageSection` / `BudgetTable` | Onglet **Pilotage** sur `/budgets/[budgetId]` : planning mensuel / atterrissage / forecast ([RFC-024](../RFC/RFC-024%20%E2%80%94%20Budget%20UI.md), [RFC-023](../RFC/RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md)) |
| **Fiche cockpit (RFC-FE-BUD-032)** — `components/budget-detail/` | |
| `BudgetDetailHeader` | `PageHeader` DS : identité + statut + méta ; Accès + **Saisir une dépense** ; barre d’outils (switch budget si plusieurs, Exporter, Version figée, Importer, Réaffecter, **Prévision d’atterrissage** hors tablist) |
| `BudgetDetailKpiStrip` | Bande **6 KPI** persistante (Budget, Atterrissage, Engagé, Consommé, Restant, Écart d’atterrissage) + filtre Tout/CAPEX/OPEX + toggle HT/TTC |
| `BudgetDetailAlertsBanner` | Alertes API `ALERT_LIST` (composant disponible) |
| `BudgetDetailTabs` | 6 onglets via **`WorkspaceTabBar`** (bandeau icône + soulignement or, sélecteur mobile) — visible y compris sur Vue d’ensemble ; **pas** d’onglet PA |
| `BudgetDetailWorkspace` | Switch de contenu + toolbar contextuelle (`BudgetExplorerToolbar` sur Prévisionnel/Suivi, `BudgetDensityToggle` sur Prévisionnel, forcé en `condense` sous `md`) ; `?onglet=pa` affiche `BudgetLandingForecastPanel` hors tablist |
| `BudgetLandingForecastPanel` | Checklist 6 étapes du rituel PA (`aria-live` sur le statut) — RFC-BUD-041 |
| `BudgetReallocationsPanel` | Journal des réaffectations + CTA création — partagé avec `/budgets/[budgetId]/reallocations` |
| `BudgetComparisonsPanel` | Versions figées récentes + `BudgetReportingForecastPage variant="embedded"` + liens `/snapshots` et `/versions` |
| `BudgetHistoriquePanel` | `BudgetDecisionTimeline` + accès à l’assistant d’import |
| `BudgetExpenseEntryModal` | `budget-detail-modals/` — formulaire unique : **Engagement / commande** ou **Consommé / Facture** |
| `BudgetLineIntelligenceDrawer` | Drawer bas (onglets ligne) — [RFC-FE-ADD-006](../RFC/RFC-FE-ADD-006%20%E2%80%94%20Budget%20Line%20Intelligence%20Drawer%20UI.md) |
| `PaginationSummary` | "1–20 sur N résultats" (RFC-FE-003) |
| `BudgetStatusBadge` | Badge de statut budget (`BudgetStatus` : DRAFT, SUBMITTED, REVISED, VALIDATED, LOCKED, ARCHIVED) — distinct des statuts exercice (`BudgetExerciseStatus`) |
| `BudgetEmptyState` | État vide avec messages par défaut budget |
| `BudgetErrorState` | Erreur + retry avec messages par défaut budget |
| **Forecast / comparaison (RFC-FE-BUD-030)** | | |
| `ForecastKpiCards`, `ForecastTable`, `ComparisonTable`, `ForecastStatusBadge`, `BudgetComparisonSelector`, `ForecastComparisonPanel`, `MultiLiveVsSnapshotsTable` | `forecast/components/` | Montants via `formatCurrency` ; onglets : actuel vs référence (baseline / **version figée**), deux versions figées, multi ; **sans** onglet « deux révisions » (RFC-019) dans ce panneau |
| `BudgetComparisonKpiCharts`, `BudgetComparisonMultiKpiCharts`, `comparison-charts-svg.tsx` | `forecast/components/` | Synthèse **graphique SVG** (barres, anneaux, courbes) sous les tableaux de comparaison — pas de dépendance `recharts` |
| `CreateBudgetSnapshotDialog` | `features/budgets/components/` | Création version figée (date, type de version figée optionnel, aide périmètre lignes) |

| **Formulaires (RFC-FE-015)** | | |
| `BudgetExerciseForm` / `BudgetForm` / `BudgetEnvelopeForm` / `BudgetLineForm` | Formulaires RHF + Zod (create/edit), `submitError` ApiFormError, `cancelHref`, `disableSubmit` (ligne si options manquantes) ; `BudgetForm` en **édition** restreint le select `status` aux transitions autorisées (`budget-status-transitions.ts`, aligné API) |
| `BudgetFormActions` | Annuler (Link `cancelHref`) + Enregistrer ; pas de `router.back()` |
| `BudgetExerciseFormPage` / `BudgetFormPage` / `BudgetEnvelopeFormPage` / `BudgetLineFormPage` | Pages conteneurs : chargement, mutation, defaultValues, redirection après succès |

Ils s’appuient sur les primitives : `PageHeader`, `Card`, `Table`, `Badge`, `EmptyState`, `ErrorState`, `LoadingState`.

---

## 7. Routes frontend (app/(protected)/budgets/)

| Route | Contenu |
|-------|---------|
| `/budgets` | **Portefeuille budgets** (RFC-FE-BUD-031 Lot A) : `PageHeader`, garde `budgets.read`, bandeau KPI consolidation (5 cellules), toggle **Cartes / Tableau** (`?view=cards\|table`, **défaut tableau**), table pattern `/projects` (icônes, tri colonnes, filtre État inline, total consolidé, `starium-projects-table` + pan), filtres URL (`exerciseId`, `search`, `status`, `page`, `limit`), source **`GET /api/budget-reporting/exercises/:id/summary`** + **`GET /api/budget-reporting/exercises/:id/budgets`** (montants HT + `expenseMix` / direction) ; export CSV ; kit `components/portfolio` |
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
| `/budgets/[budgetId]` | **Cockpit budget (RFC-FE-004 + RFC-FE-BUD-032 + RFC-BUD-041)** : `PageHeader` + bande 6 KPI + `WorkspaceTabBar` (6 onglets toujours visibles). **`?onglet=pa`** : panneau Prévision d’atterrissage **hors tablist** (CTA header, second clic pour quitter). Export CSV **client**. Modale unique **Saisir une dépense**. |
| `/budgets/dashboard` | **Budget Cockpit** (RFC-FE-002) : KPI, alertes, analytics, tableaux — lien **Forecast & comparaison** vers reporting si budget réel (RFC-FE-BUD-030) — voir [budget-cockpit.md](budget-cockpit.md) |
| `/budgets/[budgetId]/lines` | Liste lignes (détail) |
| `/budgets/[budgetId]/reporting` | **Redirect** (RFC-BUD-040 D2) vers `/budgets/[budgetId]?onglet=comparaisons` — contenu forecast/comparaison embarqué dans la fiche (RFC-FE-BUD-030) |
| `/budgets/[budgetId]/snapshots` | **Versions figées** (RFC-033) : liste (y compris captures **automatiques** aux statuts Soumis / Validé), colonnes **Figée au…** / **Date** (exécution), tri et filtres ; création manuelle ; détail `/budgets/[budgetId]/snapshots/[snapshotId]` avec bande KPI (`BudgetSnapshotKpiStrip`) |
| `/budgets/[budgetId]/versions` | Squelette |
| `/budgets/[budgetId]/reallocations` | **Journal des réaffectations** — `BudgetReallocationsPanel` (même panneau que l’onglet Réaffectations de la fiche) |
| `/budgets/imports` | Squelette |
| `/budgets/configuration` | Configuration budget : **Exercices**, **Imports**, workflow, **Types de version figée** → `/budgets/snapshot-occasion-types` (RFC-033) |
| `/admin/snapshot-occasion-types` | CRUD types de version figée **globaux** (`PLATFORM_ADMIN`, RFC-033) |

Chaque page de données gère **loading**, **error**, **empty**, **success**. Les listes `/budgets` et `/budgets/exercises` reflètent filtres et pagination dans l'URL (`view` omis si `cards`). La page **reporting** forecast gère en outre un état **no-result** (`lines.length === 0` après succès) distinct du vide générique.

**Kit portefeuille partagé** : `apps/web/src/components/portfolio/` (`PortfolioEntityCard`, `PortfolioKpiRow`, `PortfolioViewToggle`, `PortfolioProgressBar`, tons table) — référence UX : [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §6.2.

**Enveloppe** (`/budget-envelopes/[envelopeId]`) : synthèse KPI via **reporting** (`useEnvelopeSummary`) + bloc atterrissage (`useEnvelopeLanding`, table lignes) ; lien vers comparaisons budget (RFC-BUD-040).

---

## 8. Navigation

Dans `config/navigation.ts` et `components/shell/sidebar.tsx`, section Finance (dropdown Budgets) :

- **Dashboard** : `href: "/budgets/dashboard"` — cockpit budgétaire
- **Budget** : `href: "/budgets"` — portefeuille budgétaire (page par défaut du module, RFC-FE-BUD-031)
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

- [RFC-BUD-040 — Unification atterrissage, prévision et forecast](../RFC/RFC-BUD-040%20%E2%80%94%20Unification%20atterrissage%2C%20pr%C3%A9vision%20et%20forecast.md) — moteur landing, vocabulaire **Atterrissage**, redirect `/reporting`
- [RFC-FE-BUD-030 — Forecast & Comparaison budgétaire UI](../RFC/RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md) — onglet Comparaisons sur la fiche budget, composants `features/budgets/forecast/`
- [Budget Cockpit — UI & intégration](budget-cockpit.md) — `/budgets/dashboard`, HT/TTC, tableaux (dont drill-down ligne via `BudgetLineIntelligenceDrawer`), fichiers `features/budgets/dashboard/`
- [RFC-FE-001 — Budget Frontend Foundation](../RFC/RFC-FE-001%20—%20Budget%20Frontend%20Foundation.md)
- [RFC-FE-003 — Budget Exercises & Budgets List UI](../RFC/RFC-FE-003%20—%20Budget%20Exercises%20%26%20Budgets%20List%20UI.md) — listes paginées, filtres, sync URL
- [RFC-FE-003 — Conformité](../RFC/RFC-FE-003-conformite.md)
- [RFC-FE-BUD-031 — Portefeuille budgets UI (refonte mockup)](../RFC/RFC-FE-BUD-031%20%E2%80%94%20Portefeuille%20budgets%20UI%20(refonte%20mockup).md) — `/budgets` portefeuille reporting, export CSV, kit `components/portfolio`
- [RFC-FE-BUD-032 — Fiche budget cockpit](../RFC/RFC-FE-BUD-032%20%E2%80%94%20Fiche%20budget%20cockpit%20(refonte%20pr%C3%A9sentation%20%26%20fonctionnalit%C3%A9s).md) — `/budgets/[budgetId]` 3 zones + 6 onglets, `components/budget-detail/`, export CSV client, dénouement de l’engagement à la facturation
- [Module Budget MVP (backend)](budget-mvp.md)
- [API.md](../API.md) §15 (Budget Management), §16 (Financial Core), §18 (Budget Reporting), §18.1 (Budget Dashboard)
- [FRONTEND_ARCHITECTURE.md](../FRONTEND_ARCHITECTURE.md) (architecture frontend globale)
