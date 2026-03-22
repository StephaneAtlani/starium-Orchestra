# RFC-PROJ-012 — Gantt, Tâches et Jalons (MVP simple et robuste)

## Statut

Draft

## Priorité

🔥 Critique produit

## Dépendances

* RFC-PROJ-001 — Cadrage module Projets
* RFC-PROJ-002 — Prisma Schema
* RFC-PROJ-003 — Règles métier
* RFC-PROJ-009 — Audit logs

---

# 1. Objectif

Mettre en place un **système de planification projet** permettant :

* créer et structurer des **tâches**
* définir des **jalons (milestones)**
* visualiser le projet via un **Gantt**
* piloter l’avancement réel

👉 Objectif produit :
**un cockpit projet simple, lisible, utilisable immédiatement**

---

# 2. Principe fondamental

👉 Un projet est piloté uniquement avec :

* **ProjectTask**
* **ProjectMilestone**

❌ Aucun concept d’activité
❌ Aucun modèle dérivé
❌ Aucun système complexe

---

# 3. Périmètre

## Inclus

* CRUD tâches
* CRUD jalons
* hiérarchie tâches
* dépendances simples
* dates prévues et réelles
* progression
* endpoint Gantt
* affichage Gantt (lecture)

## Exclus MVP

* drag & drop
* autoscheduling
* multi-dépendances
* charge / ressources
* activité RUN
* portefeuille multi-projets Gantt

---

# 4. Modèle de données

## 4.1 Enums

```prisma
enum ProjectTaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
  CANCELLED
}

enum ProjectTaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ProjectTaskDependencyType {
  FINISH_TO_START
  START_TO_START
  FINISH_TO_FINISH
}

enum ProjectMilestoneStatus {
  PLANNED
  ACHIEVED
  DELAYED
  CANCELLED
}
```

---

## 4.2 ProjectTask

```prisma
model ProjectTask {
  id                 String   @id @default(cuid())
  clientId           String
  projectId          String

  name               String
  description        String?

  status             ProjectTaskStatus   @default(TODO)
  priority           ProjectTaskPriority @default(MEDIUM)
  progress           Int                 @default(0)

  plannedStartDate   DateTime?
  plannedEndDate     DateTime?
  actualStartDate    DateTime?
  actualEndDate      DateTime?

  parentTaskId       String?
  dependsOnTaskId    String?
  dependencyType     ProjectTaskDependencyType?

  ownerUserId        String?
  sortOrder          Int @default(0)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  parentTask         ProjectTask?  @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  childTasks         ProjectTask[] @relation("TaskHierarchy")

  dependsOnTask      ProjectTask?  @relation("TaskDependency", fields: [dependsOnTaskId], references: [id])
  dependentTasks     ProjectTask[] @relation("TaskDependency")

  @@index([clientId, projectId])
}
```

---

## 4.3 ProjectMilestone

```prisma
model ProjectMilestone {
  id            String   @id @default(cuid())
  clientId      String
  projectId     String

  name          String
  description   String?

  status        ProjectMilestoneStatus @default(PLANNED)
  targetDate    DateTime
  achievedDate  DateTime?

  linkedTaskId  String?
  sortOrder     Int @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([clientId, projectId])
}
```

---

# 5. Règles métier

## 5.1 Tâches

* `progress` ∈ [0 ; 100]
* si `status = DONE` → progress = 100
* dates cohérentes (start ≤ end)
* dépendance :

  * même projet
  * pas de boucle
  * pas auto-référence

## 5.2 Hiérarchie

* une tâche peut avoir un parent
* même projet obligatoire
* pas de cycle

## 5.3 Jalons

* pas de durée
* une seule date (targetDate)
* optional : lié à une tâche

---

# 6. API

## 6.1 Tâches

### Création

```http
POST /api/projects/:projectId/tasks
```

### Liste

```http
GET /api/projects/:projectId/tasks
```

Réponse :

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

### Update

```http
PATCH /api/projects/:projectId/tasks/:id
```

---

## 6.2 Jalons

```http
GET /api/projects/:projectId/milestones
POST /api/projects/:projectId/milestones
PATCH /api/projects/:projectId/milestones/:id
```

---

## 6.3 Gantt

```http
GET /api/projects/:projectId/gantt
```

## Règle stricte

👉 Gantt = **tasks + milestones uniquement**

---

## Exemple réponse

```json
{
  "tasks": [
    {
      "id": "task_1",
      "name": "Migration",
      "plannedStartDate": "2026-03-01",
      "plannedEndDate": "2026-03-10",
      "progress": 40
    }
  ],
  "milestones": [
    {
      "id": "ms_1",
      "name": "Go Live",
      "targetDate": "2026-03-15"
    }
  ]
}
```

---

# 7. UX/UI

## 7.1 Fiche projet

```text
Projet
 ├── Tâches
 ├── Jalons
 └── Planning / Gantt
```

---

## 7.2 Onglet Tâches

* création via bouton
* édition via drawer
* tableau structuré
* sous-tâches visibles

---

## 7.3 Onglet Jalons

* création simple
* vue liste
* lien avec tâches

---

## 7.4 Onglet Gantt

### Gauche

* arbre des tâches

### Droite

* timeline
* barres tâches
* jalons

---

## Règles visuelles

* tâche → barre
* progression → remplissage
* jalon → point
* dépendance → lien

---

# 8. États UX

* loading
* empty
* error
* success

---

# 9. Audit

```text
project_task.created
project_task.updated
project_milestone.created
project_milestone.updated
```

---

# 10. Tests

## Unit

* progress
* dates
* dépendances
* hiérarchie

## Intégration

* CRUD tâches
* CRUD jalons
* gantt
* isolation client

---

# 11. Résultat attendu

Après implémentation :

👉 tu peux :

* créer un projet
* structurer les tâches
* poser des jalons
* visualiser le planning

👉 tu obtiens :

* un vrai Gantt
* un pilotage projet réel
* une base solide pour évoluer
