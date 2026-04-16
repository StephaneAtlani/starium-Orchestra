# RFC-PROJ-SC-004 — Scenario Planning Gantt

## Statut

📝 Draft

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

---

# 7. Tests

- isolation du planning scénario
- refus de dépendances cross-scenario
- duplication depuis planning projet
- calcul des bornes calendrier

---

# 8. Plan d’implémentation

1. Ajouter `ProjectScenarioTask`.
2. Ajouter bootstrap depuis `ProjectTask`.
3. Exposer CRUD et résumé timeline.
4. Préparer l’API pour la future UI Gantt.

---

# 9. Points de vigilance

- ne pas casser le module planning actuel
- garder une séparation claire entre plan projet officiel et plan scénario
- prévoir un mapping propre si une reprise baseline est décidée plus tard
