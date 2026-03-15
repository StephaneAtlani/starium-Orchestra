# RFC-FE-003 — Vérification de conformité

Vérification du code par rapport au **plan** (rfc-fe-003_budget_lists_ui_4e3c260e.plan.md) et au **RFC** (RFC-FE-003 — Budget Exercises & Budgets List UI.md).

---

## Plan — Conformité

| Point | Statut | Détail |
|-------|--------|--------|
| 1. Types et constantes | OK | `budget-list.types.ts` (ListResult, Summary, Params), `budget-filters.ts` (DEFAULT_PAGE/LIMIT, options statut, LIMIT_OPTIONS) |
| 2. API listes (page → offset) | OK | `get-budget-exercises.ts`, `get-budgets.ts`, `get-budget-exercise-options.ts` ; réutilisation `listExercises` / `listBudgets`, pas de fetch direct |
| 3. Hooks et filtres URL | OK | `use-budget-list-filters.ts` (deux hooks), `use-budget-exercises-query.ts`, `use-budgets-query.ts`, `use-budget-exercise-options-query.ts` ; query keys tenant-aware ; reset page=1 sur changement filtre |
| 4. Composants UI | OK | PaginationSummary, BudgetExercisesToolbar, BudgetsToolbar (debounce ~300 ms), BudgetExercisesTable, BudgetsTable ; BudgetListTable + Card ; pas de duplication design system |
| 5. Pages | OK | `/budgets/exercises` et `/budgets` : RequireActiveClient, PageContainer, BudgetPageHeader, toolbars, LoadingState / ErrorState / EmptyState, tables, PaginationSummary + Précédent/Suivant |
| 6. Navigation et routes | OK | `budgetList()`, `budgetListWithExercise(exerciseId)` ; sidebar "Liste" → `/budgets`, puis Exercices, Dashboard, Imports ; config navigation idem |
| Contraintes finales | OK | Pas de route détail exercice créée ; action "Ouvrir" exercice vers `/budgets/exercises/[id]` existant ; pas d’action "Voir dashboard" ; `/budgets` = liste budgets ; design system réutilisé |

---

## RFC — Critères d’acceptation (§14)

### Exercices
- Page charge depuis `/api/budget-exercises` : OK (via `getBudgetExercises` → `listExercises`)
- Recherche : OK (toolbar + debounce, param `search`)
- Filtre `status` : OK (select + param URL)
- Pagination : OK (limit, page, Précédent/Suivant, résumé "1–20 sur N résultats")
- Filtres reflétés dans l’URL : OK (`useBudgetExercisesListFilters`, params vides exclus)
- "Voir les budgets" → `/budgets?exerciseId=<id>` : OK (`budgetListWithExercise(row.id)`)

### Budgets
- Page charge depuis `/api/budgets` : OK (via `getBudgets` → `listBudgets`)
- Recherche : OK
- Filtre `exerciseId` : OK (select alimenté par `useBudgetExerciseOptionsQuery`)
- Filtre `status` : OK
- Pagination : OK
- URL reflète l’état : OK (`useBudgetsListFilters`)
- Action ouvre `/budgets/[id]` : OK (lien "Ouvrir" → `budgetDetail(row.id)`)

### Technique
- Query keys tenant-aware : OK (`clientId` dans toutes les clés listes ; §7.1 respecté : `["budget-exercises", clientId, filters]`, `["budgets", clientId, filters]`, `["budget-exercise-options", clientId]`)
- Aucun fetch direct dans les composants : OK (tout passe par les API + `useAuthenticatedFetch`)
- Pages minces : OK
- Types alignés API : OK (`budget-list.types.ts`)
- États loading/error/empty explicites : OK
- Pas de logique métier hardcodée : OK

---

## RFC — Autres points

| Exigence | Statut |
|----------|--------|
| §5 Contrats TypeScript (ListResult, BudgetExerciseSummary, BudgetSummary, Params) | OK |
| §6 API : page → offset, status "ALL" omis | OK |
| §6.3 getBudgetExerciseOptions, limit=100 | OK |
| §8 Sync URL : page défaut 1, limit défaut 20, params vides exclus, page=1 sur changement filtre | OK |
| §9.1 budget-status-badge (existant) | OK, réutilisé |
| §9.2 / 9.3 Toolbars et tables dédiés | OK |
| §10 Loading / Error / Empty / Success (résumé pagination) | OK |
| §11.2 Filtre ownerUserId : support API oui, UI non | OK (BudgetsListParams.ownerUserId présent, pas de select dans la toolbar) |
| §11.3 Préfiltrage exercice depuis URL | OK |
| §12 Navigation Budgets → /budgets, accès /budgets/exercises | OK |
| §4 Structure : pas de fichier `mappers/budget-list.mapper.ts` | Conforme au plan : mapping dans get-*.ts |

---

## Correction appliquée lors de la vérification

- **Query key budgets** : alignée sur le RFC §7.1. La clé liste budgets est passée de `['budgets', clientId, 'list', filters]` à `['budgets', clientId, filters]` pour correspondre exactement au RFC (sans segment `'list'`).

---

## Synthèse

Le code est **conforme** au plan et au RFC-FE-003. Une seule modification a été faite pendant la vérification (format de la query key budgets). Tous les critères d’acceptation et contraintes finales sont respectés.
