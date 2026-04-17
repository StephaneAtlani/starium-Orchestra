# RFC-FE-PROJ-SC-001 — Scenarios Tab UI

## Statut

✅ Implémentée (MVP Frontend)

## Priorité

Haute

## Dépendances

- `RFC-PROJ-SC-001`
- `RFC-PROJ-SC-007`

---

# 1. Objectif

Ajouter dans la fiche projet un onglet **Scénarios** permettant :

- créer un scénario
- dupliquer un scénario
- comparer les résumés
- sélectionner la baseline
- archiver une variante

---

# 2. UX attendue

- liste/cartes de scénarios
- badge `DRAFT` / `SELECTED` / `ARCHIVED`
- résumé lisible coût / charge / délai / risque
- action primaire `Sélectionner`
- action secondaire `Dupliquer`
- confirmation avant archivage

---

# 3. Règles UI

- aucun ID brut visible
- les sélecteurs affichent `name`, `code`, `label` métier
- l’onglet lit les résumés retournés par l’API, sans recalcul métier côté frontend

---

# 4. Structure suggérée

```text
apps/web/src/features/projects/scenarios/
```

Composants suggérés :

- `ProjectScenariosTab`
- `ScenarioCard`
- `ScenarioSummaryGrid`
- `CreateScenarioDialog`
- `SelectScenarioDialog`

---

# 5. Services API

- `getProjectScenarios(projectId)`
- `createProjectScenario(projectId, payload)`
- `duplicateProjectScenario(projectId, scenarioId)`
- `selectProjectScenario(projectId, scenarioId, payload)`
- `archiveProjectScenario(projectId, scenarioId)`

---

# 6. Tests

- rendu des badges et résumés
- sélection de scénario
- affichage des libellés métier
- gestion loading / error / empty states

---

# 7. Plan d’implémentation

1. Créer client API et query keys.
2. Ajouter onglet projet.
3. Implémenter cartes + actions.
4. Gérer mutation de sélection et rafraîchissement.

---

# 8. Implémentation réalisée (MVP)

- route dédiée ajoutée : `/projects/:projectId/scenarios` (pas de `?tab=scenarios`)
- navigation intégrée dans `ProjectWorkspaceTabs` avec tab `Scénarios` et état actif
- composants livrés :
  - `ProjectScenariosView`
  - `ProjectScenariosTab`
  - `ScenarioCard`
  - `ScenarioSummaryGrid`
  - `CreateScenarioDialog`
  - `SelectScenarioDialog`
- client API frontend livré :
  - `getProjectScenarios`
  - `createProjectScenario`
  - `duplicateProjectScenario`
  - `selectProjectScenario`
  - `archiveProjectScenario`
- sélection baseline via point d’entrée unique `selectProjectScenario(projectId, scenarioId, payload?)` :
  - sans `targetProjectStatus` → `POST .../select`
  - avec `targetProjectStatus` → `POST .../select-and-transition`
- permissions UI MVP : actions visibles (`create`, `duplicate`, `select`, `archive`) mais désactivées sans `projects.update`
- règles UX MVP : `Sélectionner` primaire, `Dupliquer` secondaire, confirmation avant archivage, archivage désactivé pour `SELECTED`
- `ScenarioSummaryGrid` affiche strictement les summaries API (`budgetSummary`, `resourceSummary`, `timelineSummary`, `capacitySummary`, `riskSummary`) sans recalcul frontend ; fallback lisible si `null`
- invalidations React Query ciblées après mutation : `project detail` + `project scenarios list`
- tests frontend ajoutés (navigation/tab actif, badges, fallback summaries, routage `/select` vs `/select-and-transition`, états écran)

---

# 9. Points de vigilance

- ne pas recalculer les KPI en UI
- bien refléter la baseline courante après mutation
- garder un rendu lisible pour arbitrage rapide
