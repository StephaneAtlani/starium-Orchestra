# RFC-PROJ-SC-004 — Scenario Planning Gantt

## Statut

✅ Implémentée (backend MVP)

## Priorité

Haute

## Dépendances

- `RFC-PROJ-SC-001`
- `RFC-PROJ-011` / `RFC-PROJ-012` — tâches et gantt existants

---

# 1. Objectif

Permettre à chaque scénario de disposer d’un **planning autonome** :

- tâches projetées
- jalons
- dépendances
- dates de début / fin

Sans écraser le planning opérationnel officiel du projet.

---

# 2. Périmètre

## Inclus

- structure gantt par scénario
- duplication depuis planning projet existant
- dates projetées et dépendances
- synthèse délai

## Exclus

- synchronisation Microsoft Planner
- drag-and-drop frontend avancé

---

# 3. Modèle de données

```prisma
model ProjectScenarioTask {
  id                String   @id @default(cuid())
  clientId          String
  scenarioId        String
  sourceProjectTaskId String?

  title             String
  taskType          String?
  startDate         DateTime?
  endDate           DateTime?
  durationDays      Int?
  dependencyIds     Json?
  orderIndex        Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([clientId, scenarioId])
}
```

---

# 4. Règles métier

- un planning scénario n’affecte pas les `ProjectTask` réels tant que le scénario n’est pas retenu
- `endDate >= startDate`
- les dépendances ne peuvent cibler que des tâches du même scénario
- `dependencyIds` est normalisé en tableau de strings (`[]` si `null`/absent), sans doublon, sans auto-référence
- `taskType` autorisé : `TASK` ou `MILESTONE`
- bootstrap MVP : refus (`409`) si le scénario contient déjà au moins une tâche

---

# 5. API backend

```http
GET    /api/projects/:projectId/scenarios/:scenarioId/tasks
POST   /api/projects/:projectId/scenarios/:scenarioId/tasks
PATCH  /api/projects/:projectId/scenarios/:scenarioId/tasks/:taskId
DELETE /api/projects/:projectId/scenarios/:scenarioId/tasks/:taskId
POST   /api/projects/:projectId/scenarios/:scenarioId/bootstrap-from-project-plan
GET    /api/projects/:projectId/scenarios/:scenarioId/timeline-summary
```

---

# 6. KPI minimaux

- `plannedStartDate`
- `plannedEndDate`
- `criticalPathDuration`
- `milestoneCount`

Définition MVP implémentée :

- `plannedStartDate` = minimum des `startDate` renseignées
- `plannedEndDate` = maximum des `endDate` renseignées
- `milestoneCount` = nombre de tâches `taskType = MILESTONE`
- `criticalPathDuration` = durée calendaire inclusive en jours entre `plannedStartDate` et `plannedEndDate` (sinon `null`)

---

# 7. Tests

- isolation du planning scénario
- refus de dépendances cross-scenario
- refus auto-dépendance et doublons `dependencyIds`
- bootstrap depuis planning projet
- refus bootstrap si scénario déjà initialisé
- calcul des bornes calendrier

---

# 8. Implémentation backend livrée (MVP)

- Prisma :
  - modèle `ProjectScenarioTask` ajouté dans `apps/api/prisma/schema.prisma`
  - migration `apps/api/prisma/migrations/20260420170000_project_scenario_tasks/migration.sql`
- API :
  - `GET|POST|PATCH|DELETE /api/projects/:projectId/scenarios/:scenarioId/tasks`
  - `POST /api/projects/:projectId/scenarios/:scenarioId/bootstrap-from-project-plan`
  - `GET /api/projects/:projectId/scenarios/:scenarioId/timeline-summary`
- RBAC :
  - lecture en `projects.read`
  - mutations et bootstrap en `projects.update`
- Audit :
  - `project.scenario_task.created`
  - `project.scenario_task.updated`
  - `project.scenario_task.deleted`
  - `project.scenario_task.bootstrapped`
- Intégration scénario :
  - `timelineSummary` est alimenté sur `GET /api/projects/:projectId/scenarios/:scenarioId`
  - `timelineSummary` reste `null` sur la liste `GET /api/projects/:projectId/scenarios` (évite N+1)

---

# 9. Plan d’implémentation

1. Ajouter `ProjectScenarioTask`.
2. Ajouter bootstrap depuis `ProjectTask`.
3. Exposer CRUD et résumé timeline.
4. Préparer l’API pour la future UI Gantt.

---

# 10. Points de vigilance

- ne pas casser le module planning actuel
- garder une séparation claire entre plan projet officiel et plan scénario
- prévoir un mapping propre si une reprise baseline est décidée plus tard
