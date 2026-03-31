# RFC-PROJ-011 — Tâches, activités, jalons et base Gantt

## Statut

Implémenté (backend + migration Prisma + adaptation web listes paginées). **UI Gantt** (frise interactive : barres / jalons, liens de dépendance sur la frise — détail dans [RFC-PROJ-012 — Gantt Tâches et Jalons](RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md)) — **ne pas confondre** avec [RFC-PROJ-012 — Project Sheet](RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md).

## Priorité

Haute

## Dépendances

* RFC-PROJ-001 — Cadrage fonctionnel du module Projets
* RFC-PROJ-002 — Prisma Schema Portefeuille
* RFC-PROJ-003 — Règles métier Projets
* RFC-PROJ-009 — Audit logs module Projets
* RFC-013 — Audit logs
* RFC-011 / RFC-012 — Modules, permissions et guards
* Architecture multi-client / backend source de vérité   / UX/UI

---

## 1. Objectif

Introduire une modélisation robuste des **tâches projet**, des **activités basées sur des tâches** et des **jalons**, afin de permettre :

* un pilotage fin des projets
* une distinction claire entre **travail planifié** et **travail récurrent**
* la génération future d’un **Gantt fiable**
* un lien optionnel avec le budget
* une cohérence avec le cockpit de pilotage Starium Orchestra, orienté gouvernance opérationnelle et backend source de vérité  

---

## 2. Problème adressé

Le module Projets porte déjà le portefeuille, les risques et les jalons, mais il manque un socle structuré pour :

* découper un projet en tâches planifiables
* exprimer les dépendances entre tâches
* suivre les dates prévues et réelles
* dériver des **activités récurrentes** à partir de tâches sources
* produire un Gantt lisible sans mélanger le projet et le run

Or Starium Orchestra vise un cockpit de pilotage opérationnel, multi-client, modulaire, avec toute logique métier critique côté backend  

---

## 3. Décision fonctionnelle

### 3.1 Principe retenu

Une **activité** n’est pas un concept totalement indépendant.
Une activité est **basée sur une tâche source**.

La RFC retient donc la structure suivante :

* `ProjectTask` = entité centrale de planification projet
* `ProjectActivity` = entité dérivée d’une tâche source, pour gérer le récurrent / run / opérations répétées
* `ProjectMilestone` = entité dédiée, sans durée
* le **Gantt** est construit à partir de `ProjectTask` + `ProjectMilestone`
* `ProjectActivity` n’alimente pas le Gantt projet par défaut

### 3.2 Pourquoi ce choix

Ce choix permet de :

* garder un Gantt propre
* ne pas polluer la lecture projet avec les occurrences récurrentes
* conserver une traçabilité entre la tâche source et l’activité dérivée
* préparer une future lecture croisée BUILD / RUN

---

## 4. Concepts métier

### 4.1 ProjectTask

La tâche projet représente une unité de travail planifiable d’un projet.

Exemples :

* cadrer le besoin
* migrer les boîtes mail
* préparer la recette
* former les utilisateurs

La tâche peut :

* avoir des dates prévues et réelles
* dépendre d’une autre tâche
* être rattachée à une phase fonctionnelle (optionnel)
* avoir un responsable
* porter une progression
* être liée à une ligne budgétaire

---

### 4.2 ProjectActivity

L’activité représente une déclinaison récurrente ou opérationnelle d’une tâche source.

Exemples :

* revue hebdomadaire sécurité
* contrôle mensuel des sauvegardes
* revue trimestrielle des licences
* comité projet récurrent

Une activité :

* dérive d’une tâche source
* peut être récurrente
* peut être suivie opérationnellement
* ne remplace pas la tâche projet

---

### 4.3 ProjectMilestone

Le jalon représente un repère important du projet.

Exemples :

* validation du cadrage
* fin de migration
* go live
* validation DG

Un jalon :

* n’a pas de durée
* a une date cible
* peut être lié à une tâche
* doit pouvoir apparaître dans le Gantt

---

## 5. Périmètre

## Inclus

* modèle Prisma pour tâches, activités, jalons
* règles métier
* CRUD backend
* dépendances simples entre tâches
* phases fonctionnelles de tâches
* dates planifiées et réelles
* progression
* lien optionnel budget
* audit logs
* endpoints de lecture nécessaires au futur Gantt

## Exclus du MVP

* **code frontend** du Gantt (grille + frise, interactions) — périmètre [RFC-PROJ-012 — Gantt Tâches et Jalons](RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md), hors périmètre de la présente RFC
* ordonnancement automatique avancé
* moteur PERT / CPM
* gestion multi-dépendances complexes
* gestion de capacité ressource
* affectation multi-utilisateurs sur une même tâche
* génération automatique d’occurrences d’activités par cron
* synchronisation calendrier externe

---

## 6. Modèle de données

### 6.1 Enums Prisma

```prisma
enum ProjectTaskStatus {
  DRAFT
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

enum ProjectActivityFrequency {
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
  CUSTOM
}

enum ProjectActivityStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum ProjectMilestoneStatus {
  PLANNED
  ACHIEVED
  DELAYED
  CANCELLED
}
```

---

### 6.2 Modèle `ProjectTask`

```prisma
model ProjectTask {
  id                 String   @id @default(cuid())
  clientId           String
  projectId          String

  phaseId            String?
  dependsOnTaskId    String?

  code               String?
  name               String
  description        String?

  status             ProjectTaskStatus   @default(TODO)
  priority           ProjectTaskPriority @default(MEDIUM)
  progress           Int                 @default(0)

  plannedStartDate   DateTime?
  plannedEndDate     DateTime?
  actualStartDate    DateTime?
  actualEndDate      DateTime?

  sortOrder          Int                 @default(0)

  dependencyType     ProjectTaskDependencyType?

  ownerUserId        String?
  budgetLineId       String?

  createdByUserId    String?
  updatedByUserId    String?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  client             Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)
  project            Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  phase              ProjectTaskPhase? @relation(fields: [phaseId], references: [id], onDelete: SetNull)

  dependsOnTask      ProjectTask?  @relation("ProjectTaskDependency", fields: [dependsOnTaskId], references: [id], onDelete: SetNull)
  dependentTasks     ProjectTask[] @relation("ProjectTaskDependency")

  ownerUser          User? @relation("ProjectTaskOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)
  createdByUser      User? @relation("ProjectTaskCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  updatedByUser      User? @relation("ProjectTaskUpdatedBy", fields: [updatedByUserId], references: [id], onDelete: SetNull)

  activities         ProjectActivity[]
  milestones         ProjectMilestone[]

  @@index([clientId])
  @@index([projectId])
  @@index([clientId, projectId])
  @@index([phaseId])
  @@index([projectId, phaseId, sortOrder])
  @@index([dependsOnTaskId])
  @@index([status])
  @@index([priority])
  @@index([plannedStartDate])
  @@index([plannedEndDate])
}
```

---

### 6.3 Modèle `ProjectActivity`

```prisma
model ProjectActivity {
  id                 String   @id @default(cuid())
  clientId           String
  projectId          String?
  sourceTaskId       String

  name               String
  description        String?

  status             ProjectActivityStatus    @default(ACTIVE)
  frequency          ProjectActivityFrequency
  customRrule        String?

  nextExecutionDate  DateTime?
  lastExecutionDate  DateTime?

  ownerUserId        String?
  budgetLineId       String?

  createdByUserId    String?
  updatedByUserId    String?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  client             Client       @relation(fields: [clientId], references: [id], onDelete: Restrict)
  project            Project?     @relation(fields: [projectId], references: [id], onDelete: SetNull)
  sourceTask         ProjectTask  @relation(fields: [sourceTaskId], references: [id], onDelete: Restrict)

  ownerUser          User? @relation("ProjectActivityOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)
  createdByUser      User? @relation("ProjectActivityCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  updatedByUser      User? @relation("ProjectActivityUpdatedBy", fields: [updatedByUserId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([projectId])
  @@index([sourceTaskId])
  @@index([status])
  @@index([nextExecutionDate])
}
```

---

### 6.4 Modèle `ProjectMilestone`

```prisma
model ProjectMilestone {
  id               String   @id @default(cuid())
  clientId         String
  projectId        String
  linkedTaskId     String?
  phaseId          String?

  code             String?
  name             String
  description      String?

  status           ProjectMilestoneStatus @default(PLANNED)
  targetDate       DateTime
  achievedDate     DateTime?

  sortOrder        Int @default(0)

  ownerUserId      String?

  createdByUserId  String?
  updatedByUserId  String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  client           Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)
  project          Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  linkedTask       ProjectTask? @relation(fields: [linkedTaskId], references: [id], onDelete: SetNull)
  phase            ProjectTaskPhase? @relation(fields: [phaseId], references: [id], onDelete: SetNull)

  ownerUser        User? @relation("ProjectMilestoneOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)
  createdByUser    User? @relation("ProjectMilestoneCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  updatedByUser    User? @relation("ProjectMilestoneUpdatedBy", fields: [updatedByUserId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([projectId])
  @@index([linkedTaskId])
  @@index([phaseId])
  @@index([projectId, phaseId])
  @@index([targetDate])
  @@index([status])
}
```

---

## 7. Extension éventuelle du modèle `Project`

Sans rendre cette RFC dépendante d’un refactor majeur, le projet doit pouvoir exposer en lecture :

* nombre total de tâches
* nombre de tâches en retard
* nombre de jalons en retard
* nombre d’activités actives
* taux d’avancement agrégé

Ces agrégats sont calculés côté backend, en cohérence avec l’architecture API-first et backend source de vérité  

---

## 8. Règles métier

### 8.1 Scope client

Toutes les entités sont strictement scopées par `clientId`.

Règles obligatoires :

* une tâche appartient au client actif
* une activité appartient au client actif
* un jalon appartient au client actif
* aucune API n’accepte `clientId` dans le body
* toutes les lectures / écritures sont filtrées par le client actif

Conformité avec les règles produit multi-client de Starium Orchestra  

---

### 8.2 Tâches

* une tâche appartient obligatoirement à un projet
* `progress` doit être compris entre `0` et `100`
* si `status = DONE`, alors `progress = 100`
* si `actualEndDate` est renseignée, elle doit être ≥ `actualStartDate` si présente
* si `plannedEndDate` est renseignée, elle doit être ≥ `plannedStartDate` si présente
* une tâche ne peut pas dépendre d’elle-même
* une phase et une tâche dépendante doivent appartenir au même projet et au même client

---

### 8.3 Dépendances

MVP : une tâche peut dépendre d’une seule autre tâche via `dependsOnTaskId`.

Types supportés :

* `FINISH_TO_START`
* `START_TO_START`
* `FINISH_TO_FINISH`

Règles :

* pas de self dependency
* pas de dépendance inter-projet
* pas de dépendance inter-client
* détection de cycle obligatoire au minimum sur la chaîne simple

---

### 8.4 Phases

Une tâche peut avoir :

* zéro ou une phase

Une phase peut avoir :

* zéro à plusieurs tâches

Règles :

* phase et tâche doivent appartenir au même projet et au même client
* pas de hiérarchie récursive de tâches
* suppression d’une phase : detach automatique des tâches (`phaseId = null`)

---

### 8.5 Activités

* une activité dérive obligatoirement d’une tâche source via `sourceTaskId`
* la tâche source doit appartenir au même client
* si `projectId` est renseigné sur l’activité, il doit être cohérent avec la tâche source
* une activité ne remplace pas la tâche
* une activité n’apparaît pas dans le Gantt projet par défaut
* une activité peut être suspendue, terminée ou annulée sans modifier la tâche source

---

### 8.6 Jalons

* un jalon n’a pas de durée
* un jalon porte une `targetDate`
* `achievedDate` est optionnelle
* si `status = ACHIEVED`, alors `achievedDate` est recommandée
* un jalon peut être lié à une tâche, sans que cela soit obligatoire
* un jalon peut être rattaché à une phase (`phaseId`) ; même contrainte de scope projet/client que les tâches

---

### 8.7 Lien budgétaire

`budgetLineId` est optionnel sur :

* `ProjectTask`
* `ProjectActivity`

Règles :

* si renseigné, la ligne budgétaire doit appartenir au même client
* cette RFC ne modifie pas le financial-core
* cette RFC ne fait qu’ajouter une relation de pilotage

Ce point est cohérent avec le core financier partagé entre modules  

---

## 9. Gantt — décision de construction

Le Gantt futur est calculé à partir de :

* `ProjectTask`
* `ProjectMilestone`

### Inclus dans le Gantt

* dates prévues
* dates réelles
* regroupement par phase fonctionnelle
* dépendances
* progression
* jalons

### Exclus du Gantt MVP

* `ProjectActivity`
* occurrences récurrentes
* capacité ressource
* charge prévisionnelle

### Conséquence

Le Gantt reste un outil de planification projet, pas un écran de run.

---

## 10. API REST

Préfixe global : `/api/projects`

Toutes les routes utilisent les guards standards du domaine métier client :

```text
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Conformément à l’architecture cible NestJS / multi-client / RBAC  

---

### 10.1 Tâches

#### GET `/api/projects/:projectId/tasks`

Liste des tâches d’un projet.

Filtres possibles :

* `status`
* `priority`
* `phaseId`
* `ownerUserId`
* `search`
* `offset`
* `limit`

Tri par défaut :

* `sortOrder ASC`
* `plannedStartDate ASC`
* `createdAt ASC`

---

#### POST `/api/projects/:projectId/tasks`

Crée une tâche projet.

Body :

```json
{
  "name": "Préparer la migration",
  "description": "Préparation technique et organisationnelle",
  "status": "TODO",
  "priority": "HIGH",
  "plannedStartDate": "2026-03-25T08:00:00.000Z",
  "plannedEndDate": "2026-03-30T18:00:00.000Z",
  "phaseId": null,
  "dependsOnTaskId": null,
  "dependencyType": null,
  "ownerUserId": "usr_001",
  "budgetLineId": "bl_001",
  "sortOrder": 10
}
```

---

#### GET `/api/projects/:projectId/tasks/:id`

Retourne le détail d’une tâche.

---

#### PATCH `/api/projects/:projectId/tasks/:id`

Met à jour une tâche.

---

### 10.2 Activités

#### GET `/api/projects/:projectId/activities`

Liste les activités liées au projet.

Filtres possibles :

* `status`
* `frequency`
* `sourceTaskId`
* `ownerUserId`
* `offset`
* `limit`

---

#### POST `/api/projects/:projectId/activities`

Crée une activité dérivée d’une tâche source.

Body :

```json
{
  "sourceTaskId": "task_001",
  "name": "Revue hebdomadaire de suivi",
  "description": "Point récurrent de suivi",
  "status": "ACTIVE",
  "frequency": "WEEKLY",
  "nextExecutionDate": "2026-03-29T09:00:00.000Z",
  "ownerUserId": "usr_001",
  "budgetLineId": null
}
```

---

#### GET `/api/projects/:projectId/activities/:id`

Détail d’une activité.

---

#### PATCH `/api/projects/:projectId/activities/:id`

Met à jour une activité.

---

### 10.3 Jalons

#### GET `/api/projects/:projectId/milestones`

Liste les jalons du projet.

Filtres possibles :

* `status`
* `phaseId`
* `linkedTaskId`
* `dateFrom`
* `dateTo`
* `offset`
* `limit`

---

#### POST `/api/projects/:projectId/milestones`

Crée un jalon.

Body :

```json
{
  "name": "Go Live",
  "description": "Mise en production",
  "status": "PLANNED",
  "targetDate": "2026-04-15T08:00:00.000Z",
  "phaseId": "phase_001",
  "linkedTaskId": "task_010",
  "ownerUserId": "usr_001",
  "sortOrder": 100
}
```

---

#### GET `/api/projects/:projectId/milestones/:id`

Détail d’un jalon.

---

#### PATCH `/api/projects/:projectId/milestones/:id`

Met à jour un jalon.

---

### 10.4 Endpoint Gantt backend-ready

#### GET `/api/projects/:projectId/gantt`

Endpoint de lecture consolidé pour le futur frontend Gantt.

Réponse :

```json
{
  "projectId": "proj_001",
  "tasks": [
    {
      "id": "task_001",
      "phaseId": null,
      "dependsOnTaskId": null,
      "dependencyType": null,
      "name": "Préparer la migration",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "progress": 40,
      "plannedStartDate": "2026-03-25T08:00:00.000Z",
      "plannedEndDate": "2026-03-30T18:00:00.000Z",
      "actualStartDate": "2026-03-25T09:00:00.000Z",
      "actualEndDate": null,
      "sortOrder": 10
    }
  ],
  "milestones": [
    {
      "id": "ms_001",
      "name": "Go Live",
      "status": "PLANNED",
      "targetDate": "2026-04-15T08:00:00.000Z",
      "phaseId": "phase_001",
      "linkedTaskId": "task_010",
      "sortOrder": 100
    }
  ]
}
```

---

## 11. Permissions

Permissions proposées :

```text
projects.read
projects.create
projects.update
```

Mapping :

| Action | Permission        |
| ------ | ----------------- |
| GET    | `projects.read`   |
| POST   | `projects.create` |
| PATCH  | `projects.update` |

---

## 12. Audit logs

Les actions suivantes doivent être auditées :

```text
project_task.created
project_task.updated
project.task.phase.changed
project.task_phase.created
project.task_phase.updated
project.task_phase.deleted
project.task_phase.reordered
project_activity.created
project_activity.updated
project_milestone.created
project_milestone.updated
```

Pattern contractuel figé : les libellés d’actions d’audit sont ceux de `PROJECT_AUDIT_ACTION` (source unique), sans alias ni variante locale.

Exemple :

```json
{
  "action": "project_task.updated",
  "resourceType": "project_task",
  "resourceId": "task_001",
  "oldValue": {
    "status": "TODO",
    "progress": 0
  },
  "newValue": {
    "status": "IN_PROGRESS",
    "progress": 25
  }
}
```

---

## 13. Structure backend

Créer sous :

```text
apps/api/src/modules/projects/
```

Sous-structures recommandées :

```text
projects/
├── project-tasks.controller.ts
├── project-tasks.service.ts
├── project-activities.controller.ts
├── project-activities.service.ts
├── project-milestones.controller.ts
├── project-milestones.service.ts
├── project-gantt.controller.ts
├── dto/
│   ├── create-project-task.dto.ts
│   ├── update-project-task.dto.ts
│   ├── list-project-tasks.query.dto.ts
│   ├── create-project-activity.dto.ts
│   ├── update-project-activity.dto.ts
│   ├── list-project-activities.query.dto.ts
│   ├── create-project-milestone.dto.ts
│   ├── update-project-milestone.dto.ts
│   └── list-project-milestones.query.dto.ts
└── types/
```

Le pattern doit rester cohérent avec l’architecture modulaire NestJS déjà définie 

---

## 14. DTOs principaux

### 14.1 CreateProjectTaskDto

```text
name
description?
status?
priority?
progress?
plannedStartDate?
plannedEndDate?
actualStartDate?
actualEndDate?
phaseId?
dependsOnTaskId?
dependencyType?
ownerUserId?
budgetLineId?
sortOrder?
```

---

### 14.2 CreateProjectActivityDto

```text
sourceTaskId
name
description?
status?
frequency
customRrule?
nextExecutionDate?
lastExecutionDate?
ownerUserId?
budgetLineId?
```

---

### 14.3 CreateProjectMilestoneDto

```text
name
description?
status?
targetDate
achievedDate?
linkedTaskId?
ownerUserId?
sortOrder?
```

---

## 15. Pagination

Toutes les listes utilisent le standard :

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

Defaults :

* `limit = 20`
* `offset = 0`
* `limit max = 100`

---

## 16. Tests attendus

### 16.1 Unit tests

* validation progression 0–100
* validation dates planned / actual
* validation self dependency refusée
* validation parent / enfant même projet
* validation sourceTaskId obligatoire pour activité
* validation milestone sans durée

### 16.2 Integration tests

* isolation client
* permissions `projects.read/create/update`
* création / lecture / mise à jour tâche
* création activité liée à tâche source
* création jalon
* endpoint gantt
* audit logs générés
* refus de dépendance inter-projet
* refus de lien budget inter-client

---

## 17. Impact frontend

Cette RFC prépare les écrans suivants :

* fiche projet enrichie
* onglet tâches
* onglet activités
* onglet jalons
* vue Gantt
* alertes projet
* synthèse portefeuille

Le frontend consomme l’ordre renvoyé par le backend (phases, tâches par phase, tâches sans phase) **tel quel, sans post-tri**.

Ce découpage est cohérent avec le frontend cockpit et la structuration par features du projet  

---

## 18. Résultat attendu

À l’issue de cette RFC, Starium Orchestra disposera d’un socle projet robuste pour :

* structurer le travail projet
* gérer les tâches par phases fonctionnelles
* suivre le récurrent basé sur des tâches
* poser des jalons métier
* exposer une base backend fiable pour le Gantt
* relier progressivement le pilotage projet au budget

---

## 19. Implémentation dans le dépôt (référence)

**Prisma** : [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — enums `ProjectTaskDependencyType`, `ProjectActivityFrequency`, `ProjectActivityStatus` ; `ProjectTask` (nom, dates planifiées/réelles, `progress`, `phaseId`, dépendance simple, `ownerUserId`, lien budget optionnel) ; `ProjectTaskPhase` (conteneur fonctionnel), `ProjectMilestone` (`achievedDate`, `linkedTaskId`, `phaseId`, …) ; `ProjectActivity` avec **`projectId` obligatoire** (MVP). Migrations : socle RFC-PROJ-011 + migration de remplacement hiérarchie → phases + extension jalons (`phaseId`), avec garde-fou d’idempotence (anti double exécution).

**Backend** : `apps/api/src/modules/projects/` — `project-tasks.service.ts`, `project-milestones.service.ts`, `project-activities.service.ts`, `project-gantt.service.ts` ; contrôleurs `project-tasks`, `project-milestones`, `project-activities`, `project-gantt` ; `projects.module.ts`. **Isolation** : `clientId` actif + `getProjectForScope` ; pas de `clientId` dans les corps. **MVP** : **pas de `DELETE`** sur les tâches (éviter effets de bord jalons / action items revue / activités) ; listes paginées `{ items, total, limit, offset }` pour tâches, activités, jalons. **`GET /api/projects/:projectId/gantt`** : uniquement `ProjectTask` + `ProjectMilestone` (pas d’activités). Permissions : sous-ressources en `projects.read` / `projects.update` (aligné module existant).

**Frontend** : `apps/web/src/features/projects/` — types et API adaptés (pagination, champs `name` / `plannedEndDate` / `achievedDate`, statut jalon `ACHIEVED`). **UI Gantt** : voir [RFC-PROJ-012 — Gantt Tâches et Jalons §11](RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md) (`project-gantt-panel.tsx`, `project-task-planning-section.tsx`, `gantt-timeline-layout.ts`).

**Tests** : specs sous `apps/api/src/modules/projects/` (dont `project-tasks.service.spec.ts`, `projects-pilotage.service.spec.ts`).

**Note index** : dans [`docs/RFC/_RFC Liste.md`](_RFC%20Liste.md), une entrée historique « Project ↔ Supplier » ne doit **pas** être confondue avec le présent **RFC-PROJ-011** (tâches / activités / jalons / Gantt).
