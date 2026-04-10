# Index des RFC (Starium Orchestra)

> Dernière révision documentaire : **2026-04** — **RFC-TEAM-020** : module Équipes (work-teams, périmètres managers) basé sur **Resource HUMAN** (`resourceId`). **Staffing planifié** (ex. RFC-TEAM-007 / TEAM-008, `TeamResourceAssignment`) **retiré** : table supprimée (migration `20260404213000_drop_team_resource_assignment`), routes API correspondantes absentes. Temps réalisé **RFC-TEAM-009** : `/api/resource-time-entries`, `/api/resource-timesheet-months/...`, UI `/teams/time-entries` (grille mensuelle, filtres projet, `defaultsOnly` sur activity-types) ; RBAC `resources.read` / `resources.update` (+ `collaborators.read` déverrouillage mois). **Budget — UI prévisionnel** ([RFC-024 — Budget UI](./RFC-024%20%E2%80%94%20Budget%20UI.md)) : grille `/budgets/[budgetId]` — **Écart prév. / rév.** et **% écart prév.**. **Budget — statuts** : enum `BudgetStatus` (DRAFT, SUBMITTED, REVISED, VALIDATED, LOCKED, ARCHIVED) ; migration `20260412120000_budget_status_workflow_cycle` (remplace l’ancien `ACTIVE` par `VALIDATED`). **Budget — config workflow client** : `Client.budgetWorkflowConfig` (JSON sparse), `GET|PATCH /api/clients/active/budget-workflow-settings` (`stored` / `resolved`), UI `/budgets/workflow-settings` ; migration `20260415120000_client_budget_workflow_config`. Les colonnes *État* reflètent le dépôt au moment de la mise à jour ; vérifier le code pour la vérité opérationnelle.
>
> **Collision de numéro** : deux fichiers distincts portent **RFC-PROJ-012** — [Project Sheet (fiche décisionnelle)](./RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) et [Gantt Tâches et Jalons (UI planning)](./RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md). Ne pas les fusionner dans les tableaux ci-dessous.
>
> Vision long terme portefeuille / activités (hors MVP `Project` actuel) : [Plan de déploiement — Projet](./_Plan%20de%20déploiment%20-%20Projet.md) (dont **Points bloquants / majeurs**).

---

## Sécurité & authentification

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-002** | Authentification utilisateur | ✅ Implémentée | Login JWT, refresh, logout |
| **RFC-SEC-001** | MFA Hardening & Recovery Codes | ✅ Implémentée | Recovery codes indépendants du decrypt TOTP, endpoint dédié `POST /auth/mfa/recovery/verify`, UI 3 écrans MFA (TOTP / email / recovery), fail-fast `MFA_ENCRYPTION_KEY`, key versioning multi-clés, SMTP fail-fast prod, admin reset MFA (`POST /platform/users/:userId/reset-mfa`) ; voir [RFC](./RFC-SEC-001%20%E2%80%94%20MFA%20Hardening%20et%20Recovery%20Codes.md) |

---

## Plateforme — compte utilisateur (hors numérotation RFC projet)

| Sujet | Référence |
| ----- | --------- |
| Multi-adresses e-mail (`UserEmailIdentity`), défaut par client (`ClientUser.defaultEmailIdentityId`), API `/api/me/email-identities` et enrichissement `GET /api/me/clients` | [docs/ARCHITECTURE.md](../ARCHITECTURE.md) §3.2 et §4.0 ; code `apps/api/src/modules/me/`, `apps/web/src/services/me.ts`, `apps/web/src/lib/me-query-keys.ts` |

---

## Procurement — fournisseurs

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-FOU-025-A** | Supplier Core (Hardening & Alignment) | ✅ Implémentée | Socle fournisseur en place |
| **RFC-FOU-026** | Supplier Categories | 🟡 Partielle | MVP en place, finitions ciblées restantes |
| **RFC-FOU-027** | Supplier Contacts | 🟡 Partielle | Backend + UI MVP livrés ; tests d’intégration backend à finaliser |

---

## Teams — synchronisation annuaire

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-TEAM-001** | Synchronisation des collaborateurs depuis AD DS | ✅ Implémentée (MVP) | Implémentation Microsoft Graph/Entra ; provisioning auto vers `Membres` (`User` + `ClientUser`) ; verrouillage des membres synchronisés |
| **RFC-TEAM-002** | Référentiel Collaborateurs métier | ✅ Implémentée (backend MVP) | CRUD métier des collaborateurs (identité, fonction, manager, statut, source, tags, notes, règles sync) ; voir [RFC](./RFC-TEAM-002%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20Collaborateurs%20m%C3%A9tier.md) |
| **RFC-TEAM-003** | Référentiel Compétences | ✅ Implémentée (backend MVP) | Catalogue client de compétences (catégories, statuts, niveaux, archivage logique) ; API skills + categories, archivage logique, RBAC `skills.*` ; voir [RFC](./RFC-TEAM-003%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20Comp%C3%A9tences.md) |
| **RFC-TEAM-004** | Compétences des collaborateurs | ✅ Implémentée (backend MVP) | `CollaboratorSkill` + API nestée `/api/collaborators/:id/skills` ; vue inverse `/api/skills/:id/collaborators` utilisée par le catalogue FE (RFC-FE-TEAM-003) ; UI fiche collaborateur à venir ; voir [RFC](./RFC-TEAM-004%20%E2%80%94%20Comp%C3%A9tences%20des%20collaborateurs.md) |
| **RFC-TEAM-005** | Référentiel Équipes / périmètres managers | ✅ Implémentée (backend MVP) | `WorkTeam`, `WorkTeamMembership` sur **`resourceId` (HUMAN)**, `ManagerScopeConfig` sur **`managerResourceId`** ; API `/api/work-teams`, `/api/manager-scopes/:managerResourceId` ; RBAC `teams.*` ; voir [RFC](./RFC-TEAM-005%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20%C3%89quipes%20p%C3%A9rim%C3%A8tres%20managers.md) ; alignement **RFC-TEAM-020** |
| **RFC-TEAM-020** | Refonte Équipes — Resource HUMAN | ✅ Implémentée (socle) | Schéma + migration `collaboratorId` → `resourceId` sur memberships / lead équipe ; champs RH sur `Resource` ; **l’ancien modèle planifié `TeamResourceAssignment` est retiré** (voir migration drop) ; voir [RFC](./RFC-TEAM-020%20%E2%80%94%20Refonte%20%C3%89quipes%20Resource%20HUMAN.md) |
| **RFC-TEAM-006** | Taxonomie des activités | ✅ Implémentée (backend MVP) | `ActivityType` + enum `ActivityTaxonomyKind` ; API `/api/activity-types` ; RBAC `activity_types.read` / `activity_types.manage` ; defaults par client ; voir [RFC](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md) |
| **RFC-TEAM-007** | Affectations ressources (staffing planifié) | ⚫ Retirée (spec historique) | Contenu **documentaire** ; API et table Prisma **supprimées** du produit ; voir [RFC](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md) |
| **RFC-TEAM-008** | Staffing projet (routes projet-scopées) | ⚫ Retirée (spec historique) | Idem TEAM-007 ; voir [RFC](./RFC-TEAM-008%20%E2%80%94%20Staffing%20projet%20par%20manager%20responsable%20projet.md) |
| **RFC-TEAM-009** | Temps réalisé (API + FE grille mensuelle) | ✅ Implémentée (MVP) | `ResourceTimeEntry`, `ResourceTimesheetMonth` ; `/api/resource-time-entries`, `/api/resource-timesheet-months/...` ; UI `/teams/time-entries` (fractions jour, filtres **`myProjectsOnly`** + statut projet, **`defaultsOnly`** activity-types) ; RBAC **`resources.read`** / **`resources.update`** (+ **`collaborators.read`** déverrouillage mois) ; pas de fichier RFC Markdown dédié — détail [API.md](../API.md) (sections temps réalisé + fiche mensuelle), [ARCHITECTURE.md](../ARCHITECTURE.md) ; alignement **RFC-TEAM-020** |
| **RFC-FE-TEAM-001** | Frontend Foundation — Équipes | ✅ Implémentée | Structure `features/teams`, routes, query keys tenant-aware, API client, conventions d'état, tests unitaires ; voir [RFC](./RFC-FE-TEAM-001%20%E2%80%94%20Frontend%20Foundation%20%E2%80%94%20%C3%89quipes.md) |
| **RFC-FE-TEAM-002** | UI Collaborateurs | ✅ Implémentée (MVP FE) | Liste + détail + édition sur `/teams/collaborators`; badges `status`/`source`, filtres (`search/status/source/manager/tag`), relation manager lisible sans ID brut ; fiche : manager via `options/managers` ou catalogue **Humaine** si `resources.read` (voir §4.8) ; voir [RFC](./RFC-FE-TEAM-002%20%E2%80%94%20UI%20Collaborateurs.md) |
| **RFC-FE-TEAM-003** | UI Compétences | Implémentée (MVP catalogue FE) | `/teams/skills`, dialog porteurs, sidebar Équipes ; UI associations fiche collaborateur → lot FE suivant ; voir [RFC](./RFC-FE-TEAM-003%20%E2%80%94%20UI%20Comp%C3%A9tences.md) |
| **RFC-FE-TEAM-004** | UI Équipes / scopes managers | ✅ Implémentée (MVP FE) | `apps/web/src/features/teams/work-teams/` ; `/teams/structure/teams`, `/teams/structure/teams/[teamId]`, `/teams/structure/manager-scopes` ; `teams.read` / `teams.update` / `teams.manage_scopes` ; encart équipes fiche collaborateur → hors MVP ; voir [RFC](./RFC-FE-TEAM-004%20%E2%80%94%20UI%20%C3%89quipes%20scopes%20managers.md) |
| **RFC-FE-TEAM-005** | UI Affectations & staffing projet | ⚫ Retirée (spec / périmètre historique) | UI staffing planifié **supprimée** (`team-assignments`, `/teams/assignments`, onglet **Charge** projet) ; **conservé** : `/teams/time-entries` + `features/teams/resource-time-entries/` (RFC-TEAM-009) ; voir [RFC](./RFC-FE-TEAM-005%20%E2%80%94%20UI%20Affectations%20%26%20staffing%20projet.md) |

---

# 🔥 PHASE 1 — MODULE PROJET (PRIORITÉ ABSOLUE)

## 🧱 BACKEND — PROJET

| Ordre | RFC              | Nom                 | Description                                                     | État      | Commentaire        |
| ----- | ---------------- | ------------------- | --------------------------------------------------------------- | --------- | ------------------ |
| 1     | **RFC-PROJ-001** | Cadrage fonctionnel | Définition du périmètre projet (projet, tâche, risque, cockpit) | ✅ Couvert | Base MVP OK        |
| 2     | **RFC-PROJ-002** | Prisma Schema       | Modélisation DB : Project, Task, Risk, Milestone                | ✅ Couvert | Structure OK       |
| 3     | **RFC-PROJ-003** | Règles métier       | Calcul health, statuts, cohérence projet                        | ✅ Couvert | Service existant   |
| 4     | **RFC-PROJ-004** | Portfolio API       | CRUD projets + agrégats portefeuille                            | ✅ Couvert | `/api/projects` OK |
| 4b    | **RFC-PROJ-018** | ProjectRisk EBIOS RM | Registre risques : champs EBIOS, P×I, DTO, `.../risks`           | ✅ Couvert (MVP) | [RFC](./RFC-PROJ-018%20%E2%80%94%20ProjectRisk%20EBIOS%20RM%20minimal.md) |
| 4c    | **RFC-RISK-TAXONOMY** | RiskDomain / RiskType | Taxonomie client-scoped, `ProjectRisk.riskTypeId`, API + UI admin + cockpit | ✅ Couvert (MVP) | [RFC](./RFC-RISK-TAXONOMY.md) |

---

## 🧱 BACKEND — STRUCTURATION PORTEFEUILLE (CRITIQUE)

| Ordre | RFC              | Nom                        | Description                                                               | État      | Commentaire                                 |
| ----- | ---------------- | -------------------------- | ------------------------------------------------------------------------- | --------- | ------------------------------------------- |
| 5     | **RFC-PROJ-014** | Portfolio Categories       | Référentiel catégories + sous-catégories (arbre 2 niveaux, client-scoped) | ❌ À faire | **STRUCTURANT PRODUIT (cockpit)**           |
| 6     | **RFC-PROJ-015** | Project / Activity Mapping | Rattachement Project + Activity à une sous-catégorie                      | ❌ À faire | obligatoire pour structuration portefeuille |
| 7     | **RFC-PROJ-016** | Portfolio Aggregation      | KPI par catégorie (budget, santé, risques, ROI)                           | ❌ À faire | base arbitrage CODIR                        |

---

## 📄 BACKEND — FICHE PROJET DÉCISIONNELLE

| Ordre | RFC              | Nom                    | Description                                                      | État        | Commentaire                |
| ----- | ---------------- | ---------------------- | ---------------------------------------------------------------- | ----------- | -------------------------- |
| 8     | **RFC-PROJ-012** | Project Sheet          | Objet décisionnel lié au projet (fichier [Project Sheet](./RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md)) | ✅ Couvert (MVP) | Prisma + règles serveur ; pas confondre avec [Gantt](./RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md) |
| 9     | **RFC-PROJ-012** | Project Sheet API      | `GET` / `PATCH` fiche projet                                     | ✅ Couvert (MVP) | `GET|PATCH /api/projects/:id/project-sheet` ; isolation client                         |
| 10    | **RFC-PROJ-012** | Project Sheet Metrics  | Calcul backend : coût, budget, ROI, forecast                     | ❌ À faire   | dépend budget + ressources |
| 11    | **RFC-PROJ-012** | Project Decision Rules | Règles d’arbitrage (APPROVED / REJECTED / ON_HOLD / TO_VALIDATE) | ❌ À faire   | critique gouvernance       |

---

## 🔗 BACKEND — LIENS CRITIQUES

| Ordre | RFC              | Nom                | Description                                    | État       | Commentaire             |
| ----- | ---------------- | ------------------ | ---------------------------------------------- | ---------- | ----------------------- |
| 12    | **RFC-PROJ-010** | Project ↔ Budget   | Lier projets aux lignes/enveloppes budgétaires | ✅ Couvert  | base OK                 |
| 13    | **RFC-PROJ-010** | Project Budget KPI | Exposer KPI budget projet                      | ⚠️ Partiel | nécessaire fiche projet |
| 14    | **RFC-PROJ-011** | Tasks / Activities | Tâches, activités, jalons, `GET /gantt`       | ✅ Couvert  | UI Gantt : [RFC-PROJ-012 — Gantt](./RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md) (fichier distinct de *Project Sheet*) |
| 14b   | **RFC-PROJ-017** | Project Tags       | Référentiel d’étiquettes + assignation projet  | ✅ Couvert  | options + fiche + liste |
| 14c   | **RFC-PROJ-DOC-001** | ProjectDocument | Registre métier documents projet (Prisma + API + audit) | ✅ Couvert | MVP : pas d’upload binaire ; UI liste read-only fiche ; voir [RFC-PROJ-DOC-001](./RFC-PROJ-DOC-001%20—%20Modèle.md) |
| 14d   | **RFC-PROJ-013** | Points projet COPIL/COPRO | Historique, snapshot, types dont **POST_MORTEM** (REX) | ✅ Couvert (MVP) | [RFC](./RFC-PROJ-013%20—%20Points%20Projet%20COPIL-COPRO%20et%20Historisation.md) — seed démo `seed-project-demo-reviews.ts` |
| —     | *(future)*       | Project ↔ Supplier | Lier projets aux fournisseurs                  | ❌ À faire  | futur module            |

---

## 👥 BACKEND — RESSOURCES

| Ordre | RFC             | Nom                  | Description                        | État       | Commentaire         |
| ----- | --------------- | -------------------- | ---------------------------------- | ---------- | ------------------- |
| 15    | **RFC-RES-001** | Catalogue ressources | Registre ressources                | 🟡 Partiel | base OK             |
| 16    | **RFC-RES-002** | Resource Assignment  | Affectation ressources projets     | ❌ À faire  | critique coût réel  |
| 17    | **RFC-RES-002** | Resource Costing     | Valorisation financière ressources | ❌ À faire  | dépend fiche projet |

---

## 🔌 INTÉGRATION MICROSOFT 365 (RFC-PROJ-INT-xxx)

Cadrage : [RFC-PROJ-INT-001 — Intégration Microsoft 365](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md).

| Ordre | RFC | Nom | Description | État | Commentaire |
| ----- | --- | --- | --- | --- | --- |
| 1 | **RFC-PROJ-INT-001** | Cadrage M365 | Vision, périmètre MVP, principes | Draft | source de vérité cadrage |
| 2 | **RFC-PROJ-INT-002** | Prisma Schema | Modèles `MicrosoftConnection`, `ProjectMicrosoftLink`, sync tâches | ✅ Couvert (MVP) | `schema.prisma` : `MicrosoftConnection`, `ProjectMicrosoftLink`, tables sync ; aligné INT-007 à INT-016 |
| 3 | **RFC-PROJ-INT-003** | Auth OAuth | Flux délégué, tokens backend | ✅ Implémenté | `apps/api/src/modules/microsoft/` ; [docs/API.md](../API.md) |
| 4 | **RFC-PROJ-INT-004** | Graph Service | Client HTTP Graph v1.0 | ✅ Implémenté | `MicrosoftGraphService` + types + tests |
| 5 | **RFC-PROJ-INT-005** | Connexion client | API connexion / révocation | ✅ Implémenté | `MicrosoftAuthController` + callback ; tests service + `microsoft-auth.controller.spec.ts` ; UI `microsoft-365-settings` alignée guard |
| 6 | **RFC-PROJ-INT-006** | Sélection ressources | Teams, canaux, plans — spike requis | 🟡 Partiel (implémenté routes, tests service partiels) | pas de promesse « plan par canal » |
| 7 | **RFC-PROJ-INT-007** | Lien projet | `ProjectMicrosoftLink` GET/PUT | ✅ Implémenté | PUT sans validation Graph bloquante ; mode permissif `isEnabled=false` |
| 8 | **RFC-PROJ-INT-008** | Sync tâches → Planner | One-way, mapping | ✅ Implémenté | `ProjectTaskMicrosoftSync` + sync Graph (task + details, ETags distincts) |
| 9 | **RFC-PROJ-INT-009** | Sync documents → Teams | One-way Graph Drive, mapping `ProjectDocumentMicrosoftSync` | ✅ Implémenté (backend) | `POST .../microsoft-link/sync-documents` ; **UI pilotage** : bouton depuis **Options projet** (RFC-PROJ-OPT-001) ; statuts par document (INT-FE-009) restent à faire ; lecture fichiers `STARIUM` via `PROJECT_DOCUMENTS_STORAGE_ROOT` |
| 10 | **RFC-PROJ-INT-016** | Sync bidirectionnelle tâches | Pull Planner -> Starium + Push Starium -> Planner (starium-wins, anti-boucle, contrat enrichi) | ✅ Implémenté | Endpoint inchangé `POST /api/projects/:projectId/microsoft-link/sync-tasks` + audit dédié |

---

## 🖥️ FRONTEND — PROJET

| Ordre | RFC                 | Nom               | Description                 | État      | Commentaire |
| ----- | ------------------- | ----------------- | --------------------------- | --------- | ----------- |
| 18    | **RFC-FE-PROJ-001** | Portfolio List UI | Vue globale projets (liste) | ✅ Couvert | `/projects` — colonne catégorie portefeuille : texte multiligne (`projects-list-table`, `CellTip` `wrap`) |

---

## 🖥️ FRONTEND — PORTEFEUILLE STRUCTURÉ (CRITIQUE)

| Ordre | RFC                  | Nom                        | Description                                            | État      | Commentaire          |
| ----- | -------------------- | -------------------------- | ------------------------------------------------------ | --------- | -------------------- |
| 19    | **RFC-FE-PROJ-008**  | Portfolio Tree UI          | Vue portefeuille par catégories (arbre + regroupement) | ❌ À faire | remplace liste plate |
| 20    | **RFC-FE-PROJ-009**  | Portfolio Filters          | Filtres par catégorie / sous-catégorie                 | ❌ À faire | UX cockpit           |
| 21    | **RFC-FE-PROJ-010**  | Project Category Selector  | Sélecteur catégorie dans formulaire projet             | ❌ À faire | obligatoire          |
| 22    | **RFC-FE-PROJ-011B** | Activity Category Selector | Sélecteur catégorie pour activités                     | ❌ À faire | cohérence modèle     |

---

## 🖥️ FRONTEND — PROJET (SUITE)

| Ordre | RFC                 | Nom               | Description                    | État       | Commentaire         |
| ----- | ------------------- | ----------------- | ------------------------------ | ---------- | ------------------- |
| 23    | **RFC-FE-PROJ-002** | Project Detail UI | Cockpit projet (vue détaillée) | ✅ Couvert  | OK                  |
| 24    | **RFC-FE-PROJ-014** | Project Sheet UI  | Fiche projet décisionnelle     | ✅ Couvert (MVP) | `/projects/[projectId]/sheet` — `ProjectSheetView` ; finitions / arbitrage CODIR avancé hors scope minimal |
| 25    | **RFC-FE-PROJ-003** | Tasks UI          | Interface tâches               | ✅ Couvert  | stable              |
| 25b   | **RFC-PROJ-012**    | Gantt UI (planning) | Frise + grille, deps, drag   | ✅ Couvert  | [Gantt Tâches et Jalons](./RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md) — `/projects/[projectId]/planning` |
| 26    | **RFC-FE-PROJ-004** | Risks UI          | Interface risques              | ✅ Couvert  | EBIOS RM : [RFC-PROJ-018](./RFC-PROJ-018%20%E2%80%94%20ProjectRisk%20EBIOS%20RM%20minimal.md) — modale autosave, matrice P×I, suppression dans la modale |
| 27    | **RFC-FE-PROJ-005** | Resources UI      | Vue ressources                 | ❌ À faire  | dépend RES          |
| 28    | **RFC-FE-PROJ-006** | Budget Links UI   | Visualisation budgets          | ⚠️ Partiel | OK partiel          |
| 29    | **RFC-FE-PROJ-007** | Supplier Links UI | Visualisation fournisseurs     | ❌ À faire  | futur               |
| 30    | **RFC-FE-PROJ-011** | Project Health UI | Indicateurs santé              | ✅ Couvert  | OK                  |
| 31    | **RFC-PROJ-OPT-001** | Project Options UI | Onglets Général / Planning (buckets) / Microsoft 365 / Sync ; liaison projet ; option buckets Planner ; sync manuelle | ✅ Implémenté | [RFC](./RFC-PROJ-OPT-001%20—%20Project%20Options.md) — `apps/web/src/features/projects/options/` |

---

# ⚙️ PHASE 2 — BUDGET PRÉVISIONNEL

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-023** | Budget Prévisionnel (Planning & Atterrissage) | ✅ Implémenté (MVP) | [RFC](./RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md) — préfixe API `/api/budget-lines/:id/planning`, package `packages/budget-exercise-calendar`, journal [CHANGELOG.md](../../CHANGELOG.md) (alias DTO, audit canonique). *Ne pas confondre avec [RFC-023 — Client RBAC Administration](./RFC-023%20—%20Client%20RBAC%20Administration.md).* |
| **RFC-024** | Budget UI (Prévisionnel / Atterrissage / Forecast) | 🟡 Spec Draft — **impl. partielle** | [RFC](./RFC-024%20%E2%80%94%20Budget%20UI.md) — tableau explorateur `/budgets/[budgetId]` : onglets pilotage, grille 12 mois, colonnes tête dont **% écart prév.** (voir §5) ; pas d’endpoint dédié (lecture dérivée). *Voir aussi [RFC-024 — Budget Line Planning Engine](./RFC-024%20%E2%80%94%20Budget%20Line%20Planning%20Engine.md) (moteur).* |
| **RFC-FE-BUD-030** | Forecast & Comparaison budgétaire UI | ✅ Implémenté (MVP) | [RFC](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md) — `/budgets/[budgetId]/reporting`, lien cockpit, enveloppe, onglet forecast ; API `budget-forecast`, `budget-comparisons`, listes snapshots / version-history |
| **RFC-032** | Historisation décisions budgétaires | ✅ Implémenté (MVP) | [RFC](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) — `GET /api/budgets/:budgetId/decision-history`, audits sémantiques §4.1.5, onglet « Décisions » fiche budget ; lecture `AuditLog` via `BudgetDecisionHistoryService` |
| **RFC-033** | Versions budgétaires (produit) — version figée = snapshot | 🟢 Implémenté (MVP) | [RFC](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) — liste/détail/création, types d’occasion (global + client), admin plateforme ; distinct des révisions RFC-019 |

*(Autres roadmaps budget du dépôt : [_Plan de déploiment - Budget](./_Plan%20de%20déploiment%20-%20Budget.md).)*

---

# 🔗 PHASE 3 — FUSION PROJET + BUDGET

*(Index détaillé inchangé ici — voir plans fusion projet / budget.)*

---

# 🚨 SYNTHÈSE AJUSTÉE

## 🔥 À FAIRE MAINTENANT (CRITIQUE RÉEL)

| RFC | Pourquoi |
| --- | --- |
| **RFC-PROJ-014 → 016** | **Structure portefeuille** (catégories / rattachements / agrégats cockpit) |
| **RFC-PROJ-012** (suite) | **Métriques fiche** + **règles d’arbitrage** (lignes 10–11 table *Fiche projet*) — backend |
| **RFC-FE-PROJ-014** (suite) | Finitions **fiche** (UX arbitrage CODIR, scénarios avancés) si hors périmètre MVP actuel |
| **RFC-PROJ-010** suite | **KPI budget projet** (ligne 13 — partiel) |
| **RFC-RES-002** | Coût réel / affectation ressources |

