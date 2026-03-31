# Changelog

## Non publié

### API — Planning budgétaire (RFC-023)

- **Champs canoniques** sur `GET/PUT` et réponses de mutation planning : `planningDelta`, `landingVariance`, `remainingPlanning`, `landing`, `consumedAmount`, `committedAmount`, `monthColumnLabels`, `exerciseEndDate`.
- **Alias de transition** (même valeur que les canoniques) : `deltaVsRevised` (= `planningDelta`), `variance` (= `landingVariance`). **Suppression prévue** des alias après une fenêtre de transition annoncée ; les intégrations et le BI doivent migrer vers les noms canoniques.
- **Audit** : actions canoniques `budget_line.planning.updated`, `budget_line.planning.applied_mode`, `budget_line.planning.previewed`. Les filtres liste audit acceptent encore les anciennes chaînes via le mapping centralisé dans `budget-planning-audit-action-map.ts`.
- **Route** : `POST /api/budget-lines/:id/planning/apply-mode` (corps `{ mode, annualSpread | quarterly | … }`). Les routes `POST .../apply-*` existantes restent valides (legacy).

### Bibliothèque partagée

- Package `@starium-orchestra/budget-exercise-calendar` : alignement des mois d’exercice sur `BudgetExercise.startDate` (UTC), calcul de la prévision restante, libellés de colonnes.
