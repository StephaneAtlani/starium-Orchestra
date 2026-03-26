# RFC-PROJ-012 — Gantt, Tâches et Jalons (MVP simple et robuste)

## Statut

Implémenté (web) — avec `projects.update` : **frise interactive** (déplacement et redimensionnement des barres, jalons déplaçables, **liens de dépendance** en SVG + création **Fin → début** par drag entre ports) ; création / édition des tâches via le panneau gauche (mêmes hooks et API que l’onglet Tâches). Échelle **px/jour fixe** (pas de zoom utilisateur dans cette version). **Ne pas confondre** avec [RFC-PROJ-012 — Project Sheet](RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) (fiche projet décisionnelle, autre document).

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
* groupement des tâches par phases fonctionnelles
* dépendances simples
* dates prévues et réelles
* progression
* endpoint Gantt
* affichage Gantt interactif (frise + grille)

## Exclus MVP

* zoom temporel utilisateur (jour / semaine / mois) — prévu pour évolution
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

  phaseId            String?
  dependsOnTaskId    String?
  dependencyType     ProjectTaskDependencyType?

  ownerUserId        String?
  sortOrder          Int @default(0)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  phase              ProjectTaskPhase? @relation(fields: [phaseId], references: [id])

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
* édition via dialogue modal (création / modification)
* tableau structuré
* tâches groupées sous leur phase visible

---

## 7.3 Onglet Jalons

* création simple
* vue liste
* lien avec tâches

---

## 7.4 Onglet Gantt

### Gauche

* grille des tâches groupées par phase (actions CRUD si `projects.update`) — même logique métier que l’onglet Tâches (`ProjectTaskPlanningSection`, variant `gantt-sidebar`)
* lignes jalons en bas de grille (alignées avec la frise) ; date cible éditable par drag sur la frise si `projects.update`

### Droite

* frise temporelle : en-têtes mois / semaines (agrégation automatique si la plage est longue), grille au pas **jour** (échelle **px/jour fixe**, pas de zoom utilisateur dans cette version)
* barres tâches (dates planifiées début / fin), remplissage = progression ; si `projects.update` : **déplacer** la barre (translation des dates), **redimensionner** début / fin (poignées latérales)
* **Liens** : affichage SVG des dépendances selon `dependencyType` (ancres prédécesseur / successeur) ; **création / remplacement** d’une dépendance **Fin → début** par drag du port sortie (fin de barre) vers le port entrée (début de barre cible) — les autres types restent éditables via le formulaire tâche
* marqueurs jalons sur la date cible, ligne « aujourd’hui »
* scroll **vertical** : une seule zone (conteneur commun grille + frise) ; scroll **horizontal** : uniquement sur la frise

---

## Règles visuelles

* tâche → barre
* progression → remplissage
* jalon → point
* dépendance → lien **tracé sur la frise** (chemin orthogonal, flèche) ; création FS par drag entre ports ; **suppression** de dépendance via formulaire tâche (pas de geste dédié sur la flèche dans cette version)

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
* phases (barres de groupe dérivées backend) + tâches
* calcul layout frise (bornes, largeur, positionnement px) — `gantt-timeline-layout.spec.ts`
* géométrie des liens de dépendance — `gantt-dependency-geometry.spec.ts`

## Intégration

* CRUD tâches
* CRUD jalons
* gantt
* isolation client

---

# 11. Implémentation dans le dépôt (référence)

**Frontend** (`apps/web/src/features/projects/`) :

* [`components/project-gantt-panel.tsx`](../../apps/web/src/features/projects/components/project-gantt-panel.tsx) — split grille gauche / frise droite ; `projects.update` pour « Nouvelle tâche », drag barres / jalons, calque SVG des dépendances, ligne élastique en drag de lien ; `useProjectGanttQuery`
* [`components/project-gantt-task-bar.tsx`](../../apps/web/src/features/projects/components/project-gantt-task-bar.tsx) — barre (move / resize / ports lien)
* [`components/project-task-planning-section.tsx`](../../apps/web/src/features/projects/components/project-task-planning-section.tsx) — formulaire et mutations partagés (`useCreateProjectTaskMutation`, `useUpdateProjectTaskMutation`, DTO identiques à l’onglet Tâches) ; variants `full-table` / `gantt-sidebar`
* [`components/project-planning-tasks-tab.tsx`](../../apps/web/src/features/projects/components/project-planning-tasks-tab.tsx) — enveloppe mince vers `ProjectTaskPlanningSection` (`full-table`)
* [`lib/gantt-timeline-layout.ts`](../../apps/web/src/features/projects/lib/gantt-timeline-layout.ts) — bornes temporelles, largeur px, bandeaux mois/semaines, positionnement px, helpers drag (`shiftTaskRangeByDays`, `resizeTaskRange`, `toPlannedDateIsoUtcNoon`, …)
* [`lib/gantt-timeline-layout.spec.ts`](../../apps/web/src/features/projects/lib/gantt-timeline-layout.spec.ts) — tests Vitest sur le calcul de layout
* [`lib/gantt-dependency-geometry.ts`](../../apps/web/src/features/projects/lib/gantt-dependency-geometry.ts) — chemins SVG des liens selon `dependencyType`, `buildDependencyPaths`
* [`lib/gantt-dependency-geometry.spec.ts`](../../apps/web/src/features/projects/lib/gantt-dependency-geometry.spec.ts) — tests Vitest sur la géométrie des dépendances
* [`hooks/use-project-planning-mutations.ts`](../../apps/web/src/features/projects/hooks/use-project-planning-mutations.ts) — option `silentToast` sur `useUpdateProjectTaskMutation` / `useUpdateProjectMilestoneMutation` pour limiter les toasts lors des gestes sur la frise (succès dédié pour le lien « Dépendance enregistrée » dans le panneau Gantt)

**Backend** : inchangé par rapport à la RFC — `GET /api/projects/:projectId/gantt`, `PATCH` tâche / jalon ; isolation client (pas de `clientId` arbitraire côté client). Les rejets métier (ex. cycle de dépendance) sont renvoyés par l’API et affichés via toast.

**Performance** : calculs de layout, géométrie des liens et arbres mémoïsés côté React ; virtualisation possible en phase 2 si volumétrie importante.

---

# 12. Résultat attendu

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
