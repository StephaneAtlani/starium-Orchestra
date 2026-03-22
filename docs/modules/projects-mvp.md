# Module Projets — MVP (RFC-PROJ-001)

Ce document décrit l’implémentation **MVP** du module Projets : modèle de données, API, pilotage backend et UI. Il complète la RFC produit [RFC-PROJ-001](../RFC/RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md).

**Périmètre MVP** : pas d’objet métier `Activity` ; pas de Gantt ; pas de ticketing. Les **liens projet ↔ lignes budgétaires** sont couverts par **RFC-PROJ-010** (module `project-budget`, modèle `ProjectBudgetLink`). Pas de lien fournisseur avancé sur le projet (hors champs optionnels). Les anciennes pistes « PortfolioItem » / portefeuille projets+activités du [plan de déploiement Projet](../RFC/_Plan%20de%20déploiment%20-%20Projet.md) sont **remplacées** pour le MVP par le modèle **`Project`** + sous-ressources ci-dessous.

---

## 1. Schéma Prisma

Modèles (`apps/api/prisma/schema.prisma`) :

| Modèle | Rôle |
|--------|------|
| **Project** | Projet client-scopé (`clientId`), code unique par client, type / statut / priorité / criticité, dates, `progressPercent` manuel (0–100), budget cible optionnel, notes pilotage. |
| **ProjectTask** | Tâche rattachée à un projet (`clientId` + `projectId`). |
| **ProjectRisk** | Risque avec `ProjectRiskProbability` et `ProjectRiskImpact` (criticité **dérivée** du score P×I, pas de champ redondant). |
| **ProjectMilestone** | Jalon avec statut (dont `DELAYED`). |
| **ProjectBudgetLink** | Liaison projet ↔ ligne budgétaire (`clientId`, mode d’allocation FULL / PERCENTAGE / FIXED) — RFC-PROJ-010. |

**Non persisté au MVP** : `computedHealth`, `signals`, `warnings`, `derivedProgressPercent` (calculs à la lecture dans `projects-pilotage.service.ts`).

Enums principaux : `ProjectStatus` (dont actifs : `PLANNED`, `IN_PROGRESS`, `ON_HOLD`), `ProjectType`, `ProjectPriority`, `ProjectCriticality`, statuts tâche / risque / jalon.

---

## 2. Backend NestJS

- **Module** : `apps/api/src/modules/projects/`
- **Module** : `apps/api/src/modules/project-budget/` (RFC-PROJ-010) — `ProjectBudgetLinksService` : liens `ProjectBudgetLink`, validation d’invariants, transactions sur création/suppression, audit `project.budget_link.*`
- **Services** :
  - `projects.service.ts` — CRUD projet, liste enrichie (pilotage), `getPortfolioSummary`
  - `projects-pilotage.service.ts` — `computedHealth`, signaux, warnings, compteurs, `derivedProgressPercent` à partir des tâches, criticité risque (scores 1–9 ; **HIGH = scores 7–9**)
  - `project-tasks.service.ts`, `project-risks.service.ts`, `project-milestones.service.ts` — sous-ressources
- **Guards** (tous les contrôleurs des modules ci-dessus) : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **Audit** : création / mise à jour / suppression projet et sous-ressources tracées où implémenté ; liens budget projet en complément (`project_budget_link`)

---

## 3. API REST (préfixe `/api`)

Permissions métier : `projects.read`, `projects.create`, `projects.update`, `projects.delete`. Les **créations / modifications / suppressions** de tâches, risques et jalons passent par **`projects.update`** (pas de codes `projects.tasks.*` au MVP).

| Méthode | Route | Permission |
|---------|--------|------------|
| GET | `/projects` | `projects.read` — liste paginée **enrichie** (query : `page`, `limit`, `search`, `kind`, `status`, `priority`, `criticality`, `sortBy`, `sortOrder`, `atRiskOnly`) |
| POST | `/projects` | `projects.create` |
| GET | `/projects/portfolio-summary` | `projects.read` — KPI portefeuille (tous les projets du client actif) |
| GET | `/projects/assignable-users` | `projects.read` — membres actifs du client pour désigner un **responsable** projet |
| GET | `/projects/:id` | `projects.read` |
| PATCH | `/projects/:id` | `projects.update` |
| DELETE | `/projects/:id` | `projects.delete` |
| GET | `/projects/:projectId/tasks` \| `…/risks` \| `…/milestones` | `projects.read` |
| POST/PATCH/DELETE | sous-ressources `tasks`, `risks`, `milestones` | `projects.update` |
| GET | `/projects/:projectId/budget-links` | `projects.read` — liste paginée des liens projet ↔ ligne budgétaire (`limit`, `offset`) |
| POST | `/projects/:projectId/budget-links` | `projects.update` — corps : `budgetLineId`, `allocationType`, `percentage` / `amount` selon mode |
| DELETE | `/project-budget-links/:id` | `projects.update` |
| GET | `/projects/:id/project-sheet` | `projects.read` — fiche projet décisionnelle (RFC-PROJ-012), scope client actif |
| PATCH | `/projects/:id/project-sheet` | `projects.update` — champs fiche (cadrage, scores, ROI/priorité dérivés côté serveur, `type` / `status` projet, arbitrage 3 niveaux, motifs de refus si refus) ; audit `project.sheet.updated` |
| POST | `/projects/:id/arbitration` | `projects.update` — mise à jour du statut d’arbitrage **legacy** (`ProjectArbitrationStatus`) ; audit dédié validé / refusé |

Détail des corps et réponses : [docs/API.md](../API.md) §21.

---

## 4. Règles cockpit (résumé)

- **Signaux** (`signals`) : `isLate`, `isBlocked`, `hasNoOwner`, `hasNoTasks`, `hasNoRisks`, `hasNoMilestones`, `hasPlanningDrift`, `isCritical` — calculés backend.
- **Statuts « actifs »** pour plusieurs signaux (ex. absence de tâches / jalons / risques) : `PLANNED`, `IN_PROGRESS`, `ON_HOLD` (aligné sur la RFC plan « projet actif »).
- **Warnings** : codes `NO_OWNER`, `NO_TASKS`, `NO_RISKS`, `NO_MILESTONES`, `PLANNING_DRIFT`, `BLOCKED`.

---

## 5. Frontend

- **Feature** : `apps/web/src/features/projects/` (API client, hooks React Query, types, composants) — section **Budget** sur le détail projet (`ProjectBudgetSection`, RFC-PROJ-010) ; **fiche décisionnelle** sur le détail (`ProjectSheetView`, `GET/PATCH …/project-sheet`, autosave)
- **Routes** : `apps/web/src/app/(protected)/projects/` — `/projects`, `/projects/new`, `/projects/[projectId]`
- **Navigation** : `apps/web/src/config/navigation.ts` — entrée « Projets », `moduleCode: 'projects'`, `requiredPermissions: ['projects.read']`
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
