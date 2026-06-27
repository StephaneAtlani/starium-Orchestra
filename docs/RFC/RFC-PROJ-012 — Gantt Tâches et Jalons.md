# RFC-PROJ-012 — Gantt, Tâches et Jalons (MVP simple et robuste)

## Statut

Implémenté (web) — **cockpit Planning** avec sous-onglets **Macro** (défaut), **Planning / Gantt** et **Jalons** sur `/projects/:projectId/planning?sub=macro|gantt|milestones` ; onglet **Tâches** (liste + Kanban) sur `/projects/:projectId/tasks`. Sous-onglet Gantt : avec `projects.update`, **frise interactive** (déplacement et redimensionnement des barres, jalons déplaçables, **liens de dépendance** en SVG + création **Fin → début** par drag entre ports) ; création / édition des tâches via le panneau gauche (mêmes hooks et API que l’onglet Tâches). Gantt détaillé : échelle **Jour / Semaine / Mois**, **zoom temps** (boutons + Ctrl/Cmd + molette), filtres et options d’affichage (jalons, libellés frise, infobulles, couleur des barres) ; vue Macro en échelle **semaine** fixe avec pan par pas discrets. **Ne pas confondre** avec [RFC-PROJ-012 — Project Sheet](RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) (fiche projet décisionnelle, autre document).

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
* vue **Macro** (pilotage CODIR : phases, jalons, synthèse latérale) — lecture seule, consomme `GET /tasks`, `GET /milestones` et phases tâches (pas le payload `/gantt`)

## Exclus MVP

* zoom temporel utilisateur sur le Gantt détaillé (jour / semaine / mois) — prévu pour évolution ; la vue Macro reste en échelle semaine fixe
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
  phaseId       String?

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
  @@index([phaseId])
  @@index([projectId, phaseId])
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
      "targetDate": "2026-03-15",
      "phaseId": "phase_1",
      "linkedTaskId": "task_1"
    }
  ]
}
```

---

# 7. UX/UI

## 7.1 Navigation workspace projet

```text
Projet
 ├── Tâches          → /projects/:projectId/tasks?sub=tasks|kanban
 └── Planning        → /projects/:projectId/planning?sub=macro|gantt|milestones
      ├── Macro      (défaut)
      ├── Planning / Gantt
      └── Jalons
```

Orchestration : `ProjectPlanningView` (`project-planning-view.tsx`), routes via `projectTasks()` / `projectPlanning()` dans `project-routes.ts`.

---

## 7.2 Onglet Tâches (`/tasks`)

* sous-onglets **Liste** et **Kanban** (`?sub=tasks` | `?sub=kanban`)
* création via bouton
* édition via dialogue modal (création / modification)
* tableau structuré
* tâches groupées sous leur phase visible

---

## 7.3 Cockpit Planning (`/planning`)

Sous-navigation `role="tablist"` : **Macro** | **Planning / Gantt** | **Jalons**. Paramètre `sub` absent ou invalide → **Macro**.

### 7.3.1 Macro (`?sub=macro`)

Vue **lecture seule** de pilotage (CODIR / chef de projet) — pas de CRUD inline.

**Données** : `useProjectTasksQuery`, `useProjectMilestonesQuery`, `useProjectDetailQuery`, phases via `listProjectTaskPhases` ; **pas** `GET /gantt`.

**Layout** : grille Gantt unifiée (`starium-gantt-*`) — en-têtes mois / semaines (`S{n}` sans date sous la semaine), lignes **phase** (barre agrégée + sous-barre tâche représentative si repliée), losanges **jalons** (regroupés sur la ligne « Jalons » si repliée), ligne **Aujourd’hui**. Colonne libellés + frise dans le même conteneur ; **pas de scroll horizontal** (`overflow: hidden`, largeur 100 %).

**Déplier / replier** (lecture seule, pas de CRUD sur la frise) :

* chevron sur chaque ligne **phase** lorsqu’elle contient au moins une tâche — affiche sous la phase la liste des tâches (libellé + barre individuelle si datée) ;
* chevron sur la ligne **Jalons** lorsqu’il y a au moins un jalon — affiche une ligne par jalon (libellé + losange sur la frise) ;
* en phase **dépliée**, la sous-barre représentative est masquée ; en **repliée**, les losanges ou tâches détaillés sont masqués sur la ligne synthèse ;
* l’état déplié est **réinitialisé** au changement des filtres équipe / phase (`viewportFocusKey`).

**Infobulles** : au survol des barres (phase, sous-barre, tâche) et des losanges — contenu riche aligné sur le Gantt détaillé (`MacroGanttPhaseTooltipContent`, `ProjectGanttTaskTooltipContent`, `ProjectGanttMilestoneTooltipContent` dans `project-gantt-entity-tooltip.tsx`) ; les déclencheurs ignorent le pan horizontal (`stopPropagation` sur pointer down).

**Densité libellés** : colonne phase compacte (`starium-gantt-rowlabel--phase`) ; piste **double** (`starium-gantt-track--dual`, `min-height` adapté) lorsque barre agrégée + sous-barre coexistent pour éviter le clipping.

**Fenêtre temporelle** : ~12 semaines, ancrée sur le premier contenu daté ; navigation par **pas discrets** de 7 jours (`panStep`, bornes `getMacroPlanningMaxPanStep`) :

* boutons période précédente / suivante (désactivés aux bornes)
* bouton **Aujourd’hui** (recalcule le pas pour centrer la date du jour)
* **pan** souris / doigt (`useMacroGanttPanDrag`, ~72 px = 1 pas, `touch-action: none`)

Barres recadrées sur l’intersection visible (`rangeToTimelinePercent`) ; jalons hors fenêtre masqués.

**Toolbar** (`starium-fbtn`) : filtres **équipe** et **phase** (libellés métier, pas d’ID visible). Pas de toggle Semaine/Mois (échelle `week` fixe). Pas de légende en bas de frise.

**Sidebar** (`ProjectPlanningMacroSidebar`, deux cartes `starium-panel`) :

1. **Jalons** — titre dynamique : *Prochain jalon* (jalon ouvert futur), *Jalon en retard* (tous les jalons ouverts passés), ou *Jalons* + message vide ; lien vers sous-onglet Jalons.
2. **Santé du planning** — `computedHealth`, avancement, tâches en retard, charge équipe indicative.

### 7.3.2 Jalons (`?sub=milestones`)

Vue **liste opérationnelle** des jalons du projet (CRUD via dialog si `projects.update`).

**Données** : `useProjectMilestonesQuery` ; jointures d’affichage côté client : `useProjectTasksQuery` (nom de la tâche liée), `useProjectAssignableUsers` (responsable), `useProjectMilestoneLabelsQuery` + `listProjectTaskPhases` (étiquettes et phases — **libellés métier**, jamais d’ID brut en UI).

**Layout** (aligné onglet **Tâches** — `starium-proj-*`, `starium-stat-cards`, `starium-tablecard`, `starium-dt`) :

* **Bandeau KPI** (`ProjectMilestonesStatStrip`) : total, planifiés, atteints, en retard (pastilles sémantiques + %).
* **Toolbar** (`starium-toolbar`) : hint + bouton `starium-btn-primary` « Nouveau jalon ».
* **Tableau** (`starium-dt`) : colonnes **Jalon** (icône losange colorée rotative + nom / code), **Phase**, **Étiquettes** (tags colorés), **Tâche liée**, **Responsable** (avatar + nom court), **Statut** (`starium-ds-badge`), **Date cible**, **Date atteinte**.
* **Grab/pan** : tableaux denses projet via **`StariumTableWrap`** (`useTablePan` — souris **et** doigt, Pointer Events) ; seuil ~6 px ; **`useStariumTablePan().shouldSuppressClick`** sur les lignes cliquables. Kanban : pan dédié. Voir [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §8.
* **Dialog CRUD** : `MilestoneFormDialog` — gabarit modale formulaire dense ([FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §11.3.1 : bandeau `DialogHeader`, scroll `DialogBody`, pied `DialogFooter`, champs `starium-form-*` dans `milestone-form-dialog-fields.tsx`) ; réutilisé depuis le Gantt (`ProjectTaskPlanningSection`) et l’onglet Jalons.
* États **loading** / **error** / **empty** (`LoadingState`, `Alert`, `EmptyState`).

### 7.3.3 Planning / Gantt (`?sub=gantt`)

**Chrome** (`ProjectGanttView` / `ProjectGanttToolbar` / `ProjectGanttCard`, classes `starium-project-gantt-*` dans `globals.css`) :

* bannière projet (nom, statut, période planifiée) ;
* toolbar en deux rangées : échelle segmentée, zoom temps, filtres (`Select` statut, mode couleur barres), switches (jalons, libellés frise, infobulles), plein écran, « Nouvelle tâche » ;
* légende couleurs des barres (`GanttBarColorLegend`) selon le mode choisi.

### Gauche

* grille des tâches groupées par phase (actions CRUD si `projects.update`) — même logique métier que l’onglet Tâches (`ProjectTaskPlanningSection`, variant `gantt-sidebar`)
* jalons affichés dans leur groupe de phase (pas en bloc séparé en bas)
* si un jalon est lié à une tâche et que les deux partagent la même phase, la tâche est affichée juste après le jalon
* toggle `Jalons` : masque les jalons dans la frise **et** dans la grille gauche

### Droite

* frise temporelle : en-têtes mois / semaines / jours (selon densité), grille au pas **jour** ; **zoom temps** utilisateur (`timeZoom`, Ctrl/Cmd + molette sur la frise) et échelle **Jour / Semaine / Mois** (recalcul `px/jour` + remplissage largeur visible)
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
* calcul layout frise (bornes, largeur, positionnement px, clip barres visibles) — `gantt-timeline-layout.spec.ts`
* fenêtre Macro, pas de pan, position « aujourd’hui », `subTaskId` / `getMacroPlanningTaskRangeMs` — `build-macro-planning-gantt.spec.ts`
* géométrie des liens de dépendance — `gantt-dependency-geometry.spec.ts`

## Intégration

* CRUD tâches
* CRUD jalons
* gantt
* isolation client

---

# 11. Implémentation dans le dépôt (référence)

**Frontend** (`apps/web/src/features/projects/`) :

* [`components/project-planning-view.tsx`](../../apps/web/src/features/projects/components/project-planning-view.tsx) — shell Planning + sous-onglets Macro / Gantt / Jalons
* [`components/project-planning-macro-tab.tsx`](../../apps/web/src/features/projects/components/project-planning-macro-tab.tsx) — vue Macro (frise phases/jalons, filtres, pan, déplier phases/jalons, infobulles frise)
* [`components/project-macro-gantt-bar.tsx`](../../apps/web/src/features/projects/components/project-macro-gantt-bar.tsx) — barres / losanges Macro avec `Tooltip` (pan non déclenché au survol)
* [`components/project-planning-macro-sidebar.tsx`](../../apps/web/src/features/projects/components/project-planning-macro-sidebar.tsx) — cartes jalons + santé planning
* [`components/project-planning-milestones-tab.tsx`](../../apps/web/src/features/projects/components/project-planning-milestones-tab.tsx) — sous-onglet Jalons (KPI strip, tableau `starium-dt`, grab/pan, `MilestoneFormDialog`)
* [`components/milestone-form-dialog.tsx`](../../apps/web/src/features/projects/components/milestone-form-dialog.tsx) — modale création / édition jalon (gabarit §11.3.1 FRONTEND_UI-UX)
* [`components/milestone-form-dialog-fields.tsx`](../../apps/web/src/features/projects/components/milestone-form-dialog-fields.tsx) — corps formulaire jalon (`starium-form-*`)
* [`components/project-gantt-entity-tooltip.tsx`](../../apps/web/src/features/projects/components/project-gantt-entity-tooltip.tsx) — infobulles tâche / jalon / phase Macro (`MacroGanttPhaseTooltipContent`, …)
* [`components/project-milestones-stat-strip.tsx`](../../apps/web/src/features/projects/components/project-milestones-stat-strip.tsx) — bandeau KPI jalons
* [`lib/project-milestone-display.ts`](../../apps/web/src/features/projects/lib/project-milestone-display.ts) — stats, badges statut, libellés étiquettes
* [`components/project-tasks-list-tab.tsx`](../../apps/web/src/features/projects/components/project-tasks-list-tab.tsx) — liste tâches (`starium-dt`, filtres, grab/pan)
* [`components/project-tasks-stat-strip.tsx`](../../apps/web/src/features/projects/components/project-tasks-stat-strip.tsx) — bandeau KPI tâches (onglet `/tasks`)
* [`gantt/components/project-gantt-view.tsx`](../../apps/web/src/features/projects/gantt/components/project-gantt-view.tsx) — chrome Gantt (bannière, toolbar, carte, poignée split)
* [`lib/build-macro-planning-gantt.ts`](../../apps/web/src/features/projects/lib/build-macro-planning-gantt.ts) — lignes phase, fenêtre ~12 sem., `panStep`, marqueurs jalons
* [`lib/build-macro-planning-gantt.spec.ts`](../../apps/web/src/features/projects/lib/build-macro-planning-gantt.spec.ts) — tests viewport / pan
* [`hooks/use-macro-gantt-pan-drag.ts`](../../apps/web/src/features/projects/hooks/use-macro-gantt-pan-drag.ts) — drag horizontal → incrément `panStep`
* [`constants/project-routes.ts`](../../apps/web/src/features/projects/constants/project-routes.ts) — `projectPlanning(id)` → `?sub=macro` par défaut ; `projectTasks(id)` → `/tasks`
* [`components/project-gantt-panel.tsx`](../../apps/web/src/features/projects/components/project-gantt-panel.tsx) — split grille gauche / frise droite ; `projects.update` pour « Nouvelle tâche », drag barres / jalons, calque SVG des dépendances, ligne élastique en drag de lien ; `useProjectGanttQuery`
* [`components/project-gantt-task-bar.tsx`](../../apps/web/src/features/projects/components/project-gantt-task-bar.tsx) — barre (move / resize / ports lien)
* [`components/project-task-planning-section.tsx`](../../apps/web/src/features/projects/components/project-task-planning-section.tsx) — formulaire et mutations partagés (`useCreateProjectTaskMutation`, `useUpdateProjectTaskMutation`, DTO identiques à l’onglet Tâches) ; variants `full-table` / `gantt-sidebar`
* [`components/project-planning-tasks-tab.tsx`](../../apps/web/src/features/projects/components/project-planning-tasks-tab.tsx) — enveloppe mince vers `ProjectTaskPlanningSection` (`full-table`)
* [`lib/gantt-timeline-layout.ts`](../../apps/web/src/features/projects/lib/gantt-timeline-layout.ts) — bornes temporelles, largeur px, bandeaux mois/semaines, positionnement px, helpers drag (`shiftTaskRangeByDays`, `resizeTaskRange`, `toPlannedDateIsoUtcNoon`, …)
* [`lib/gantt-timeline-layout.spec.ts`](../../apps/web/src/features/projects/lib/gantt-timeline-layout.spec.ts) — tests Vitest sur le calcul de layout
* [`lib/gantt-dependency-geometry.ts`](../../apps/web/src/features/projects/lib/gantt-dependency-geometry.ts) — chemins SVG des liens selon `dependencyType`, `buildDependencyPaths`
* [`lib/gantt-dependency-geometry.spec.ts`](../../apps/web/src/features/projects/lib/gantt-dependency-geometry.spec.ts) — tests Vitest sur la géométrie des dépendances
* [`lib/build-gantt-body-rows.ts`](../../apps/web/src/features/projects/lib/build-gantt-body-rows.ts) — **ordre unique** des lignes (phases, jalons avec tâche liée, tâches) partagé entre la grille et la frise ; le panneau Gantt construit ce corps à partir du payload `GET /gantt` et le transmet à `ProjectTaskPlanningSection` via la prop `ganttUnifiedBodyRows` (la grille réconcilie avec les requêtes tâches/jalons pour l’édition inline)
* [`hooks/use-project-planning-mutations.ts`](../../apps/web/src/features/projects/hooks/use-project-planning-mutations.ts) — option `silentToast` sur `useUpdateProjectTaskMutation` / `useUpdateProjectMilestoneMutation` pour limiter les toasts lors des gestes sur la frise (succès dédié pour le lien « Dépendance enregistrée » dans le panneau Gantt)
* [`hooks/use-table-pan.ts`](../../apps/web/src/hooks/use-table-pan.ts) — grab/pan générique tableaux (Pointer Events souris + doigt, seuil anti-clic accidentel) — voir [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §8

**Backend** : inchangé par rapport à la RFC — `GET /api/projects/:projectId/gantt`, `PATCH` tâche / jalon ; isolation client (pas de `clientId` arbitraire côté client). Les rejets métier (ex. cycle de dépendance) sont renvoyés par l’API et affichés via toast.

**Performance** : calculs de layout, géométrie des liens et lignes corps mémoïsés côté React ; virtualisation possible en phase 2 si volumétrie importante.

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
