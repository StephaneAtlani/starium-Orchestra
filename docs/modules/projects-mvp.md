# Module Projets — MVP (RFC-PROJ-001)

Ce document décrit l’implémentation **MVP** du module Projets : modèle de données, API, pilotage backend et UI. Il complète la RFC produit [RFC-PROJ-001](../RFC/RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md).

**Périmètre MVP initial** : pas de ticketing. Les **liens projet ↔ lignes budgétaires** sont couverts par **RFC-PROJ-010** (module `project-budget`, modèle `ProjectBudgetLink`). Pas de lien fournisseur avancé sur le projet (hors champs optionnels). Les **tâches structurées, activités dérivées, jalons enrichis** et le **payload `GET /gantt`** sont couverts par **[RFC-PROJ-011](../RFC/RFC-PROJ-011%20%E2%80%94%20T%C3%A2ches%20%20activit%C3%A9s%20jalons%20et%20base%20Gantt.md)** ; l’**UI Gantt** (grille + frise alignées, dépendances, drag / resize) est décrite et implémentée sous **[RFC-PROJ-012 — Gantt Tâches et Jalons](../RFC/RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md)** (à ne pas confondre avec l’autre fichier **RFC-PROJ-012 — Project Sheet**). Les anciennes pistes « PortfolioItem » / portefeuille projets+activités du [plan de déploiement Projet](../RFC/_Plan%20de%20déploiment%20-%20Projet.md) sont **remplacées** pour le MVP par le modèle **`Project`** + sous-ressources ci-dessous ; ce plan long terme inclut aussi des **points bloquants** transverses (archivage, statuts actifs, imports, alertes, exports).

---

## 1. Schéma Prisma

Modèles (`apps/api/prisma/schema.prisma`) :

| Modèle | Rôle |
|--------|------|
| **Project** | Projet client-scopé (`clientId`), code unique par client, type / statut / priorité / criticité, dates, `progressPercent` manuel (0–100), budget cible optionnel, notes pilotage, responsable via `ownerUserId` **ou** identité nom libre (`ownerFreeLabel` + `ownerAffiliation`). |
| **ProjectTask** | Tâche planifiable (`clientId` + `projectId`) : nom, dates planifiées/réelles, `progress`, hiérarchie parent/enfant, dépendance simple (`dependsOnTaskId`), responsable `ownerUserId`, lien budget optionnel — **RFC-PROJ-011**. |
| **ProjectRisk** | Risque avec `ProjectRiskProbability` et `ProjectRiskImpact` (criticité **dérivée** du score P×I, pas de champ redondant). Champs et formulaire **EBIOS RM** minimal : **[RFC-PROJ-018](../RFC/RFC-PROJ-018%20%E2%80%94%20ProjectRisk%20EBIOS%20RM%20minimal.md)**. |
| **ProjectMilestone** | Jalon sans durée (`targetDate`, `achievedDate`, lien tâche optionnel `linkedTaskId`, statut dont `ACHIEVED`, `DELAYED`) — **RFC-PROJ-011**. |
| **ProjectActivity** | Activité dérivée d’une tâche source, `projectId` obligatoire (MVP), hors payload Gantt — **RFC-PROJ-011**. |
| **ProjectBudgetLink** | Liaison projet ↔ ligne budgétaire (`clientId`, mode d’allocation FULL / PERCENTAGE / **BUDGET_PERCENTAGE** / FIXED) — RFC-PROJ-010. |
| **ProjectReview** (+ participants, décisions, action items, **attachments**) | Point projet (RFC-PROJ-013 / **013-2**) : types `COPIL` / `COPRO` / … / **`POST_MORTEM`** ; cycle **`PREPARING` → `SCHEDULED` → `IN_PROGRESS` → `FINALIZED` \| `CANCELLED`** ; `objective`, `reviewDate` nullable ; ODJ typé ; décisions enrichies ; `snapshotPayload` **v2** à la finalisation ; isolation `clientId` + `projectId`. |

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
  - `project-reviews.service.ts` — points projet (RFC-PROJ-013 / 013-1 / **013-2**), cycle `PREPARING`/`SCHEDULED`/`IN_PROGRESS`, attachments, snapshot v2, audit `project.review.*`
  - `project-review-invitations.service.ts` — notifications in-app / email / Teams (RFC-PROJ-013-1)
  - `project-review-attachments.service.ts` — pièces jointes point projet (RFC-PROJ-013-2)
  - `project-review-agenda.service.ts`, `project-review-participants.service.ts` — ordre du jour et participants
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
| GET | `/projects/assignable-users` | `projects.read` — répertoire pour la désignation du responsable : `{ users, freePersons }` (comptes client + identités nom libre déjà vues dans l’équipe projet du client actif) |
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
| POST | `/projects/:projectId/reviews` | `projects.update` — création (`creationMode` : `PREPARING` \| `SCHEDULED` \| `IMMEDIATE`, `objective`, date optionnelle) |
| GET | `/projects/:projectId/reviews/:reviewId` | `projects.read` — détail (+ agenda typé, attachments, décisions enrichies ; `snapshotPayload` v2 si finalisé) |
| PATCH | `/projects/:projectId/reviews/:reviewId` | `projects.update` — éditabilité selon statut pilotage |
| POST | `/projects/:projectId/reviews/:reviewId/schedule` | `projects.update` — planification / replanification (RFC-PROJ-013-2) |
| POST | `/projects/:projectId/reviews/:reviewId/start` | `projects.update` — `→ IN_PROGRESS` |
| POST | `/projects/:projectId/reviews/:reviewId/start-review` | `projects.update` — alias `start` (rétrocompat) |
| POST | `/projects/:projectId/reviews/:reviewId/finalize` | `projects.update` — finalisation + snapshot v2 |
| POST | `/projects/:projectId/reviews/:reviewId/cancel` | `projects.update` — annulation |
| POST | `/projects/:projectId/reviews/:reviewId/invite` | `projects.update` — invitations (revue `SCHEDULED`) — voir [API.md](../API.md) §21 |
| POST/PATCH/DELETE | `…/reviews/:reviewId/attachments` | pièces jointes (RFC-PROJ-013-2) |
| POST/PATCH/… | `/projects/:projectId/reviews/:reviewId/agenda-items` | `projects.update` — ordre du jour (RFC-PROJ-013-1) |
| POST/PATCH/DELETE | `/projects/:projectId/reviews/:reviewId/participants` | `projects.update` — participants (`attendanceStatus`, `externalEmail` externes) |

Détail des corps et réponses : [docs/API.md](../API.md) §21.

---

## 4. Règles cockpit (résumé)

- **Signaux** (`signals`), **santé** (`computedHealth`), **warnings** : calculés dans `projects-pilotage.service.ts` ; exposition liste / détail via les mêmes champs.
- **Statuts « actifs »** pour plusieurs signaux (ex. absence de tâches / jalons / risques) : `PLANNED`, `IN_PROGRESS`, `ON_HOLD` (aligné sur la RFC plan « projet actif »).
- **`isBlocked` / `BLOCKED`** : **`ON_HOLD` uniquement**. Les risques `OPEN` à criticité HIGH/CRITICAL influencent la **santé** (`RED`) et `isCritical`, mais ne déclenchent plus l’alerte « Bloqué ».
- **Warnings** : codes `NO_OWNER`, `NO_TASKS`, `NO_RISKS`, `NO_MILESTONES`, `PLANNING_DRIFT`, `BLOCKED`.
- **Budget liste** : chaque item de `GET /projects` expose **`targetBudgetAmount`** (budget cible fiche) et **`consumedBudgetAmount`** (agrégat consommé des liens **FIXED** — `consumedBudgetAmountsByProjectId` dans `projects.service.ts`).
- **Détail des règles** (santé RED/ORANGE/GREEN, chaque booléen `signals`, correspondance pastilles vs alertes) : [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §8.3.

---

## 5. Frontend

- **Feature** : `apps/web/src/features/projects/` (API client, hooks React Query, types, composants) — **aperçu / synthèse** sur `/projects/[projectId]` (`ProjectSynthesisOverviewCards` : grille KPI, [`ProjectPostMortemOverviewBanner`](../../apps/web/src/features/projects/components/project-post-mortem-overview-banner.tsx) pour REX projet clos, [`ProjectPilotageAttentionPanel`](../../apps/web/src/features/projects/components/project-pilotage-attention-panel.tsx), données récentes, budget synthèse) ; onglet **Budget** `/projects/[projectId]/budget` (`ProjectBudgetSection`, `ProjectBudgetSynthesis`, KPI strip, mode **BUDGET_PERCENTAGE** + dépassement imputé — RFC-PROJ-010) ; **fiche décisionnelle** (`ProjectSheetView`, route `/projects/[projectId]/sheet`, `GET/PATCH …/project-sheet`, autosave) ; onglet **Points projet** (`?tab=points`, `ProjectReviewsTab`, RFC-PROJ-013 + **013-1** + **013-2** — cycle pilotage `PREPARING`/`SCHEDULED`/`IN_PROGRESS`, éditeur **7 onglets**, CTA footer **Planifier → Envoyer notifications → Démarrer → Finaliser**, ODJ typé, décisions/actions/attachments, invitations, deep links `?createRetourExperience=1` / `?openReview=<id>`) ; **Tâches** (`/projects/[projectId]/tasks`, liste `ProjectTasksListTab` + Kanban, KPI strip, **`StariumTableWrap`**) ; **Planning** (`ProjectPlanningView`, RFC-PROJ-012 Gantt) — sous-onglets **Macro** (`ProjectPlanningMacroTab` : déplier phases/jalons, infobulles frise, pan ; défaut), **Gantt** (`ProjectGanttPanel`, toolbar chrome, zoom, `useProjectGanttQuery`), **Jalons** (`ProjectPlanningMilestonesTab`, KPI strip + tableau enrichi, `MilestoneFormDialog`) ; **Risques** (`project-risks-view.tsx`, tableau dense + `StariumTableWrap`) ; **Options projet** (RFC-PROJ-OPT-001) : `apps/web/src/features/projects/options/` — route `/projects/[projectId]/options`, onglet **Options** dans `ProjectWorkspaceTabs`
- **Routes** : `apps/web/src/app/(protected)/projects/` — `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/tasks`, `/projects/[projectId]/budget`, `/projects/[projectId]/options`, `/projects/[projectId]/planning` (`?sub=macro|gantt|milestones`, défaut macro), `/projects/[projectId]/sheet`, `/projects/options` (entrée sidebar **Option** module — placeholder ou paramètres globaux module)
- **Navigation** : `apps/web/src/config/navigation.ts` — entrée **Projets** en sous-menu (survol, même principe que Budgets) : **Portefeuille projet** → `/projects`, **Option** → `/projects/options` ; implémentation `apps/web/src/components/shell/sidebar.tsx`. `moduleCode: 'projects'`, `requiredPermissions: ['projects.read']`
- **Sécurité UI** : `RequireActiveClient`, `PermissionGate`, données via `authFetch` + TanStack Query — **pas** de calcul cockpit de santé côté client (affichage des champs renvoyés par l’API)
- **Cockpit liste** : **mobile** — cartes `ProjectsListMobileView` + bottom sheet filtres (RFC-FE-MOB-002/003) ; **desktop** — `ProjectsToolbar` + tableau `ProjectsListTableDesktop` (densité colonnes `basic` | `extended`, budget/consommé §4) ; KPI **4 × `KpiCard` dense** dans `.starium-module` — [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §6.1, §7, §8.1.
- **Signaux / alertes (détail & fiches)** : même jeu `computedHealth` + `signals` + `warnings` qu’en liste ; éviter la surcharge du header — voir [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §8.2.
- **Création** : formulaire **deux colonnes** sur grand écran ; responsable désigné soit via compte client, soit via identité nom libre (**Interne/Externe**) depuis le répertoire **`GET /api/projects/assignable-users`** (`users` + `freePersons`), pas l’endpoint admin global utilisateurs.

---

## 6. Seed & RBAC

- Module `projects` et permissions `projects.read|create|update|delete` : `apps/api/prisma/seed.js`, profils `apps/api/prisma/default-profiles.json`
- Client démo : activation du module projets où prévu dans le seed
- **Points projet démo** (RFC-PROJ-013-2) : `seed-project-demo-reviews.ts` — statuts `PREPARING` / `SCHEDULED` / `IN_PROGRESS` / `FINALIZED` / `CANCELLED`, dont un point **PREPARING** sans date sur SEED-01
- **Étiquettes démo** (RFC-PROJ-017) : `apps/api/prisma/seed-project-demo-tags.ts` — `ProjectTag` + affectations par projet, `ProjectTaskLabel` + affectations sur chaque tâche démo (rotation Priorité / Documentation / Recette), `ProjectMilestoneLabel` sur les deux premiers jalons du projet **SEED-01** ; réinitialisation des labels tâche/jalon démo à chaque seed
- Rôles système d’équipe projet garantis par client (idempotent) : `SPONSOR`, `OWNER` et rôle référent métier (créés/ré-assurés via `ensureDefaultTeamRolesForClient`, appelés notamment sur `listRoles`, `getTeam` et création projet)

---

## 7. Tests

- **Unitaires** : `apps/api/src/modules/projects/projects-pilotage.service.spec.ts` (santé, dérivé, risque, blocage)
- **Points projet** : `apps/api/src/modules/projects/project-reviews/` — **51** tests backend (cycle pilotage RFC-PROJ-013-2, attachments, snapshot v2, agenda, invitations) ; frontend `apps/web/src/features/projects/lib/project-review-status.spec.ts` (CTA planifier / démarrer / invitations)
- **À renforcer** (hors MVP minimal) : tests d’intégration isolation multi-client sur `ProjectsService` / sous-ressources

---

## 8. Évolutions documentées ailleurs

- **Registre documents projet (`ProjectDocument`)** : [RFC-PROJ-DOC-001](../RFC/RFC-PROJ-DOC-001%20—%20Modèle.md) — implémenté (API `/api/projects/:projectId/documents`, audit, liste read-only sur fiche projet ; pas d’upload binaire au MVP).
- **Lien projet ↔ budget (lignes)** : RFC-PROJ-010 — implémenté (`project-budget`).
- Autres RFC numérotées RFC-PROJ-002 … dans les roadmaps historiques peuvent rester des **extensions** futures (fournisseurs, ressources, cockpit avancé). Le MVP actuel les **recouvre partiellement** sous RFC-PROJ-001 sans les publier comme RFC séparées partout.
