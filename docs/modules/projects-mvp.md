# Module Projets — MVP (RFC-PROJ-001)

Ce document décrit l’implémentation **MVP** du module Projets : modèle de données, API, pilotage backend et UI. Il complète la RFC produit [RFC-PROJ-001](../RFC/RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md).

**Périmètre MVP initial** : pas de ticketing. Les **liens projet ↔ lignes budgétaires** sont couverts par **RFC-PROJ-010** (module `project-budget`, modèle `ProjectBudgetLink`). Pas de lien fournisseur avancé sur le projet (hors champs optionnels). Les **tâches structurées, activités dérivées, jalons enrichis et endpoint Gantt backend** sont couverts par **[RFC-PROJ-011](../RFC/RFC-PROJ-011%20%E2%80%94%20T%C3%A2ches%20%20activit%C3%A9s%20jalons%20et%20base%20Gantt.md)** (pas d’**UI Gantt** visuelle au MVP — prévu hors scope RFC §5). Les anciennes pistes « PortfolioItem » / portefeuille projets+activités du [plan de déploiement Projet](../RFC/_Plan%20de%20déploiment%20-%20Projet.md) sont **remplacées** pour le MVP par le modèle **`Project`** + sous-ressources ci-dessous.

---

## 1. Schéma Prisma

Modèles (`apps/api/prisma/schema.prisma`) :

| Modèle | Rôle |
|--------|------|
| **Project** | Projet client-scopé (`clientId`), code unique par client, type / statut / priorité / criticité, dates, `progressPercent` manuel (0–100), budget cible optionnel, notes pilotage. |
| **ProjectTask** | Tâche planifiable (`clientId` + `projectId`) : nom, dates planifiées/réelles, `progress`, hiérarchie parent/enfant, dépendance simple (`dependsOnTaskId`), responsable `ownerUserId`, lien budget optionnel — **RFC-PROJ-011**. |
| **ProjectRisk** | Risque avec `ProjectRiskProbability` et `ProjectRiskImpact` (criticité **dérivée** du score P×I, pas de champ redondant). |
| **ProjectMilestone** | Jalon sans durée (`targetDate`, `achievedDate`, lien tâche optionnel `linkedTaskId`, statut dont `ACHIEVED`, `DELAYED`) — **RFC-PROJ-011**. |
| **ProjectActivity** | Activité dérivée d’une tâche source, `projectId` obligatoire (MVP), hors payload Gantt — **RFC-PROJ-011**. |
| **ProjectBudgetLink** | Liaison projet ↔ ligne budgétaire (`clientId`, mode d’allocation FULL / PERCENTAGE / FIXED) — RFC-PROJ-010. |
| **ProjectReview** (+ participants, décisions, action items) | Point projet COPIL/COPRO (RFC-PROJ-013) : statut brouillon / finalisé / annulé, `contentPayload` / `executiveSummary`, `snapshotPayload` à la finalisation, isolation `clientId` + `projectId`. |

**Non persisté au MVP** : `computedHealth`, `signals`, `warnings`, `derivedProgressPercent` (calculs à la lecture dans `projects-pilotage.service.ts`).

Enums principaux : `ProjectStatus` (dont actifs : `PLANNED`, `IN_PROGRESS`, `ON_HOLD`), `ProjectType`, `ProjectPriority`, `ProjectCriticality`, statuts tâche (dont `DRAFT`) / risque / jalon (jalon : `ACHIEVED` remplace l’ancien `REACHED` en base).

---

## 2. Backend NestJS

- **Module** : `apps/api/src/modules/projects/`
- **Module** : `apps/api/src/modules/project-budget/` (RFC-PROJ-010) — `ProjectBudgetLinksService` : liens `ProjectBudgetLink`, validation d’invariants, transactions sur création/suppression, audit `project.budget_link.*`
- **Services** :
  - `projects.service.ts` — CRUD projet, liste enrichie (pilotage), `getPortfolioSummary`
  - `projects-pilotage.service.ts` — `computedHealth`, signaux, warnings, compteurs, `derivedProgressPercent` comme **moyenne des `progress`** sur les tâches non annulées (RFC-PROJ-011), criticité risque (scores 1–9 ; **HIGH = scores 7–9**)
  - `project-tasks.service.ts`, `project-risks.service.ts`, `project-milestones.service.ts`, `project-activities.service.ts`, `project-gantt.service.ts` — sous-ressources (RFC-PROJ-011 pour tâches/jalons enrichis, activités, Gantt-ready)
  - `project-reviews.service.ts` — points projet COPIL/COPRO (RFC-PROJ-013), snapshot à la finalisation, audit `project.review.*`
- **Guards** (tous les contrôleurs des modules ci-dessus) : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **Audit** : création / mise à jour / suppression projet et sous-ressources tracées où implémenté ; liens budget projet en complément (`project_budget_link`)

---

## 3. API REST (préfixe `/api`)

Permissions métier : `projects.read`, `projects.create`, `projects.update`, `projects.delete`. Les **créations / modifications** de tâches, risques, jalons, activités passent par **`projects.update`** (pas de codes `projects.tasks.*` au MVP). **Tâches (RFC-PROJ-011)** : pas de **`DELETE`** sur tâche au MVP (annulation via statut si besoin).

| Méthode | Route | Permission |
|---------|--------|------------|
| GET | `/projects` | `projects.read` — liste paginée **enrichie** (query : `page`, `limit`, `search`, `kind`, `status`, `priority`, `criticality`, `sortBy`, `sortOrder`, `atRiskOnly`) |
| POST | `/projects` | `projects.create` |
| GET | `/projects/portfolio-summary` | `projects.read` — KPI portefeuille (tous les projets du client actif) |
| GET | `/projects/assignable-users` | `projects.read` — membres actifs du client pour désigner un **responsable** projet |
| GET | `/projects/:id` | `projects.read` |
| PATCH | `/projects/:id` | `projects.update` |
| DELETE | `/projects/:id` | `projects.delete` |
| GET | `/projects/:projectId/tasks` | `projects.read` — liste paginée `{ items, total, limit, offset }` (filtres RFC-PROJ-011) |
| POST | `/projects/:projectId/tasks` | `projects.update` |
| GET | `/projects/:projectId/tasks/:id` | `projects.read` |
| PATCH | `/projects/:projectId/tasks/:id` | `projects.update` |
| GET | `/projects/:projectId/gantt` | `projects.read` — payload **uniquement** tâches + jalons (pas d’activités) — RFC-PROJ-011 |
| GET \| POST \| PATCH | `/projects/:projectId/activities` et `…/activities/:id` | `projects.read` / `projects.update` — RFC-PROJ-011 |
| GET | `/projects/:projectId/risks` \| `…/milestones` | `projects.read` — jalons : liste paginée `{ items, total, limit, offset }` |
| POST/PATCH/DELETE | sous-ressources `risks`, `milestones` | `projects.update` |
| GET | `/projects/:projectId/budget-links` | `projects.read` — liste paginée des liens projet ↔ ligne budgétaire (`limit`, `offset`) |
| POST | `/projects/:projectId/budget-links` | `projects.update` — corps : `budgetLineId`, `allocationType`, `percentage` / `amount` selon mode |
| DELETE | `/project-budget-links/:id` | `projects.update` |
| GET | `/projects/:id/project-sheet` | `projects.read` — fiche projet décisionnelle (RFC-PROJ-012), scope client actif |
| PATCH | `/projects/:id/project-sheet` | `projects.update` — champs fiche (cadrage, scores, ROI/priorité dérivés côté serveur, `type` / `status` projet, arbitrage 3 niveaux, motifs de refus si refus) ; audit `project.sheet.updated` |
| POST | `/projects/:id/arbitration` | `projects.update` — mise à jour du statut d’arbitrage **legacy** (`ProjectArbitrationStatus`) ; audit dédié validé / refusé |
| GET | `/projects/:projectId/reviews` | `projects.read` — liste des points projet (sans `snapshotPayload` dans les items) |
| POST | `/projects/:projectId/reviews` | `projects.update` — création point (brouillon) |
| GET | `/projects/:projectId/reviews/:reviewId` | `projects.read` — détail (`snapshotPayload` toujours présent, `null` si non finalisé) |
| PATCH | `/projects/:projectId/reviews/:reviewId` | `projects.update` — mise à jour brouillon uniquement |
| POST | `/projects/:projectId/reviews/:reviewId/finalize` | `projects.update` — finalisation + snapshot serveur (transaction) |
| POST | `/projects/:projectId/reviews/:reviewId/cancel` | `projects.update` — annulation depuis brouillon |

Détail des corps et réponses : [docs/API.md](../API.md) §21.

---

## 4. Règles cockpit (résumé)

- **Signaux** (`signals`) : `isLate`, `isBlocked`, `hasNoOwner`, `hasNoTasks`, `hasNoRisks`, `hasNoMilestones`, `hasPlanningDrift`, `isCritical` — calculés backend.
- **Statuts « actifs »** pour plusieurs signaux (ex. absence de tâches / jalons / risques) : `PLANNED`, `IN_PROGRESS`, `ON_HOLD` (aligné sur la RFC plan « projet actif »).
- **Warnings** : codes `NO_OWNER`, `NO_TASKS`, `NO_RISKS`, `NO_MILESTONES`, `PLANNING_DRIFT`, `BLOCKED`.

---

## 5. Frontend

- **Feature** : `apps/web/src/features/projects/` (API client, hooks React Query, types, composants) — section **Budget** sur le détail projet (`ProjectBudgetSection`, RFC-PROJ-010) ; **fiche décisionnelle** sur le détail (`ProjectSheetView`, `GET/PATCH …/project-sheet`, autosave) ; onglet **Points projet** (`ProjectReviewsTab`, RFC-PROJ-013) sur `/projects/[projectId]`
- **Routes** : `apps/web/src/app/(protected)/projects/` — `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/options` (placeholder **Option** module Projets)
- **Navigation** : `apps/web/src/config/navigation.ts` — entrée **Projets** en sous-menu (survol, même principe que Budgets) : **Portefeuille projet** → `/projects`, **Option** → `/projects/options` ; implémentation `apps/web/src/components/shell/sidebar.tsx`. `moduleCode: 'projects'`, `requiredPermissions: ['projects.read']`
- **Sécurité UI** : `RequireActiveClient`, `PermissionGate`, données via `authFetch` + TanStack Query — **pas** de calcul cockpit de santé côté client (affichage des champs renvoyés par l’API)
- **Cockpit liste** : filtres incluant **nature** (`kind` : projet / activité, query alignée backend) ; KPI portefeuille en **bandeaux compacts** (pas les cartes KPI génériques d’autres écrans) — détail visuel : [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §6–8.
- **Création** : formulaire **deux colonnes** sur grand écran ; responsable alimenté par **`GET /api/projects/assignable-users`** (utilisateurs du client actif avec droit d’assignation), pas l’endpoint admin global utilisateurs.

---

## 6. Seed & RBAC

- Module `projects` et permissions `projects.read|create|update|delete` : `apps/api/prisma/seed.js`, profils `apps/api/prisma/default-profiles.json`
- Client démo : activation du module projets où prévu dans le seed

---

## 7. Tests

- **Unitaires** : `apps/api/src/modules/projects/projects-pilotage.service.spec.ts` (santé, dérivé, risque, blocage)
- **À renforcer** (hors MVP minimal) : tests d’intégration isolation multi-client sur `ProjectsService` / sous-ressources

---

## 8. Évolutions documentées ailleurs

- **Lien projet ↔ budget (lignes)** : RFC-PROJ-010 — implémenté (`project-budget`).
- Autres RFC numérotées RFC-PROJ-002 … dans les roadmaps historiques peuvent rester des **extensions** futures (fournisseurs, ressources, cockpit avancé). Le MVP actuel les **recouvre partiellement** sous RFC-PROJ-001 sans les publier comme RFC séparées partout.
