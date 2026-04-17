# RFC-PROJ-SC-007 — Scenario Selection Workflow

## Statut

✅ Implémentée (backend MVP)

## Priorité

Très haute

## Dépendances

- `RFC-PROJ-SC-001`
- `RFC-PROJ-013` — historisation projet
- `RFC-013` — audit logs

---

# 1. Objectif

Formaliser la **décision de sélection d’un scénario** quand un projet passe en préparation d’exécution, afin d’obtenir :

- une baseline unique
- un historique de décision
- un archivage automatique des alternatives
- un point de référence pour le pilotage futur

---

# 2. Déclencheur métier (MVP livré)

Le workflow s’exécute quand le projet passe vers :

```text
PLANNED
IN_PROGRESS
```

MVP livré : la sélection explicite est portée par `POST /select-and-transition`.
Le lot **ne bloque pas globalement** `PATCH /api/projects/:id`.

---

# 3. Règles métier

- un seul scénario sélectionné par projet
- sélection atomique via transaction
- archivage automatique des scénarios concurrents en `ARCHIVED`
- historique MVP via audit logs uniquement (pas de `ProjectReview` dans ce lot)
- `archiveOtherScenarios` accepté en payload pour compatibilité mais forcé à `true` côté service
- `decisionNote` optionnelle (trim, vide normalisé à `null`, max 2000)

---

# 4. API backend (implémentée)

```http
POST /api/projects/:projectId/scenarios/:scenarioId/select
POST /api/projects/:projectId/scenarios/:scenarioId/select-and-transition
```

Payload recommandé :

```json
{
  "targetProjectStatus": "PLANNED",
  "decisionNote": "Option retenue après arbitrage CODIR",
  "archiveOtherScenarios": true
}
```

Réponse `POST /api/projects/:projectId/scenarios/:scenarioId/select-and-transition` :

```json
{
  "scenarioId": "scn_123",
  "projectId": "prj_123",
  "selectedStatus": "SELECTED",
  "projectStatus": "PLANNED"
}
```

Contraintes MVP :

- `targetProjectStatus` autorisé uniquement sur `PLANNED | IN_PROGRESS`
- si le projet est déjà dans le statut cible : succès idempotent
- `POST /select` est conservé pour compatibilité et ne met pas à jour le statut projet

---

# 5. Effets attendus

1. le scénario ciblé passe `SELECTED`
2. `isBaseline = true`
3. les autres scénarios passent `ARCHIVED`
4. le projet peut passer à l’état cible
5. des audits RFC-007 sont produits

---

# 6. Audit / historique

Événements :

```text
project.scenario.selected
project.scenario.auto_archived
project.status.changed_from_scenario_selection
```

Historisation projet :

- MVP : audit logs uniquement
- pas de création `ProjectReview` dans ce lot
- `decisionNote` incluse dans l’audit pertinent quand présente

---

# 7. Tests

- blocage si scénario inexistant ou hors client
- transaction complète sur sélection + archivage + changement statut projet
- refus si plusieurs scénarios sélectionnés suite à race condition
- refus scénario `ARCHIVED`
- refus `targetProjectStatus` hors `PLANNED | IN_PROGRESS`
- idempotence si projet déjà au statut cible

---

# 8. Implémentation livrée (backend MVP)

1. DTO `SelectProjectScenarioDto` ajouté (validation stricte `targetProjectStatus`, normalisation `decisionNote`).
2. Endpoint `POST /select-and-transition` exposé dans `project-scenarios.controller.ts`.
3. Workflow transactionnel unique dans `project-scenarios.service.ts` :
   - sélection + archivage automatique + transition statut projet.
4. Audits RFC-007 ajoutés :
   - `project.scenario.selected`
   - `project.scenario.auto_archived`
   - `project.status.changed_from_scenario_selection`
5. Documentation API synchronisée dans `docs/API.md`.

---

# 9. Points de vigilance

- très fort risque de dette si la sélection reste purement UI
- le backend doit être la source de vérité de la baseline
- prévoir l’idempotence des doubles clics / retries
- périmètre volontairement backend-only ; pas de changement frontend dans ce lot
