# Index des RFC (Starium Orchestra)

> Dernière révision documentaire : **2026-05** — **RFC-ACL-014** : conformité accès (registre diagnostic par intention, lockout dernière capacité ADMIN ACL, `GET /api/access-diagnostics/effective-rights/me`, guards Option A **uniquement** sur mutations `/api/resource-acl/*`, `/me/permissions` + `roles[]`, `docs/ACCESS-MODEL.md`). **RFC-ACL-017** (V1) : politique d’accès ressource (`ResourceAccessPolicy`, modes `DEFAULT` / `RESTRICTIVE` / `SHARING`), `GET` liste ACL enrichi (`accessPolicy`, `effectiveAccessMode`), `PATCH .../access-policy`, audit `resource_access_policy.changed` ; plancher SHARING via `sharingFloorAllows` documenté en RFC ; [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md) (**V1** — module `access-decision`, pilote Projets lecture/liste, verdict `AccessDecisionResult`) unifie scope org + politique/ACL (`sharingFloorAllows = floorAllowed`). **RFC-ACL-019** (V1 — diagnostic enrichi activable : variable d’environnement `ACCESS_DIAGNOSTICS_ENRICHED` = `true` ou `1` au sens strict ; alignement **read** sur `AccessDecisionService.decide`, blocs org / ownership / policy, `evaluationMode` sur les six couches + contrôles self étendus ; sans flag, payload identique au contrat historique). **RFC-ACL-015** (**partiel — socle livré**) : package `@starium-orchestra/rbac-permissions`, guards, `GET /me/permissions` ; filtrage métier scope = **016** + **018**/**020**. **RFC-ACL-020** (**implémentée — activation prod couplée 022**) : moteur read/write/admin sur Projets, Budgets (+ lignes), Contrats, Fournisseurs, objectifs stratégiques ; flags `ACCESS_DECISION_V2_*` ; UI ownership étendue ; tests `access-decision.modules.integration.spec.ts` ; [runbook](../runbooks/migration-org-scope-access.md). **RFC-ACL-022** (**socle livré**) : `ClientFeatureFlag`, `FeatureFlagsService`, CLI `backfill-owner-org-unit.ts`. **RFC-ACL-024** (**V1 livrée**) : `@RequireAccessIntent`, registre `SERVICE_ENFORCED_REGISTRY`, guards scope-aware (guard ≤ service), `accessDecisionV2` sur `/me/permissions`, `hasIntent` UI. **Tranche 2 (draft)** : [RFC-ORG-004](./RFC-ORG-004%20%E2%80%94%20Steward%20transfert%20et%20obligation%20ownership.md), [RFC-ACL-025](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md)–[026](./RFC-ACL-026%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%20acc%C3%A8s%20V2.md) — [_Plan Org & licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md). : socle organisation client (`OrgUnit` / `OrgGroup`, rattachements **Resource HUMAN** uniquement), API `/api/organization/*`, UI `/client/administration/organization`, module RBAC `organization.*`, filtre `actionPrefix` sur `GET /api/audit-logs` (exclusif avec `action`). **RFC-ORG-003** (V1) : `ownerOrgUnitId` sur six entités, `ownerOrgUnitSummary`, UI ownership (projet, budget/ligne, fournisseur, contrat, objectif stratégique) + `OwnerOrgUnitNullWarning`. **RFC-TEAM-020** : module Équipes (work-teams, périmètres managers) basé sur **Resource HUMAN** (`resourceId`). **Staffing planifié** (ex. RFC-TEAM-007 / TEAM-008, `TeamResourceAssignment`) **retiré** : table supprimée (migration `20260404213000_drop_team_resource_assignment`), routes API correspondantes absentes. Temps réalisé **RFC-TEAM-009** : `/api/resource-time-entries`, `/api/resource-timesheet-months/...`, UI `/teams/time-entries` (grille mensuelle, filtres projet, `defaultsOnly` sur activity-types) ; RBAC `resources.read` / `resources.update` (+ `collaborators.read` déverrouillage mois). **Budget — UI prévisionnel** ([RFC-024 — Budget UI](./RFC-024%20%E2%80%94%20Budget%20UI.md)) : grille `/budgets/[budgetId]` — **Écart prév. / rév.** et **% écart prév.**. **Budget — statuts** : enum `BudgetStatus` (DRAFT, SUBMITTED, REVISED, VALIDATED, LOCKED, ARCHIVED) ; migration `20260412120000_budget_status_workflow_cycle` (remplace l’ancien `ACTIVE` par `VALIDATED`). **Budget — config workflow client** : `Client.budgetWorkflowConfig` (JSON sparse), `GET|PATCH /api/clients/active/budget-workflow-settings` (`stored` / `resolved`), UI `/budgets/workflow-settings` ; migration `20260415120000_client_budget_workflow_config`. **Budget — versions figées auto** ([RFC-033](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md)) : capture `BudgetSnapshot` au passage **Soumis** / **Validé** ; types globaux `WORKFLOW_SUBMITTED` / `WORKFLOW_VALIDATED` ; échec → audit `budget.workflow_snapshot.failed` (RFC-032). **Budget — UI versions figées / comparaison** : liste avec colonnes « Figée au… » / « Date » (exécution), détail avec bande KPI ; comparaison avec axe **engagé** ([RFC-FE-BUD-030](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md)) ; seed cockpit `apps/api/prisma/seed-budget-cockpit-complete.ts` + `seed-snapshot-from-events.ts` (détail [RFC-033](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) §1.4). Les colonnes *État* reflètent le dépôt au moment de la mise à jour ; vérifier le code pour la vérité opérationnelle.
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

## Plateforme — alertes & notifications

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-038** | Socle alertes et emails async | 🟢 Implémentée (socle MVP) | Prisma `Alert` / `Notification` / `EmailDelivery`, API `/api/alerts` et `/api/notifications`, queue BullMQ + Redis, worker `pnpm start:worker` (`apps/api`), UI cloche + panel critiques sur `/dashboard` ; triggers `AlertsTriggerService` encore no-op ; permissions seedées — enrichir `default-profiles.json` ou rôles pour `notifications.*` en démo |

---

## Plateforme — recherche

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-039** | Recherche transversale (Global Search) | 📝 Draft | Commande globale + endpoint unique `GET /api/search`, agrégation multi-modules côté backend avec scope client actif et RBAC, résultats UI en valeur métier (`label`/`subtitle`) sans ID brut |

---

## Procurement — fournisseurs

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-FOU-025-A** | Supplier Core (Hardening & Alignment) | ✅ Implémentée | Socle fournisseur en place |
| **RFC-FOU-026** | Supplier Categories | 🟡 Partielle | MVP en place, finitions ciblées restantes |
| **RFC-FOU-027** | Supplier Contacts | 🟡 Partielle | Backend + UI MVP livrés ; tests d’intégration backend à finaliser |
| **RFC-034** | Documents et GED — Devis, Commande, Facture | 📝 Draft | **Phase 1 livrée (code)** : pièces jointes PO/facture, stockage local ou S3 ([RFC-035](./RFC-035%20%E2%80%94%20Procurement%20stockage%20local%20et%20dual%20backend.md)), settings plateforme `GET|PATCH /api/platform/procurement-s3-settings`, UI « Documents » dans le dialogue budget ; devis / `SupplierQuotation` — Phase 2 — voir [RFC](./RFC-034%20%E2%80%94%20Documents%20et%20GED%20%E2%80%94%20Devis%20Commande%20Facture.md) |
| **RFC-035** | Procurement — stockage local et dual backend | 📝 Draft | Disque local par défaut (compose), S3 optionnel ; `PROCUREMENT_STORAGE_DRIVER`, `PROCUREMENT_LOCAL_ROOT` ; sentinel `local` sur `storageBucket` ; voir [RFC](./RFC-035%20%E2%80%94%20Procurement%20stockage%20local%20et%20dual%20backend.md) |
| **RFC-036** | Gestion des contrats (fournisseur / IT) | ✅ Implémentée (MVP) | Prisma + API `/api/contracts` + pièces `/api/contracts/:id/attachments` + UI `/contracts` ; seed module `contracts` + rôle global CLIENT_ADMIN ; profils `default-profiles.json` enrichis ; voir [RFC](./RFC-036%20%E2%80%94%20Gestion%20des%20contrats.md) |
| **RFC-037** | Gestion des licences et liaison native aux contrats | 📝 Draft | Module **Licenses** autonome (Pilotage) avec lien métier natif vers `Contracts` : cardinalité `Contract 1 -> N Licenses`, `License.contractId?`, vues cockpit/filtres/fiches croisées ; voir [RFC](./RFC-037%20%E2%80%94%20Gestion%20des%20licences%20et%20liaison%20native%20aux%20contrats.md) |

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

## Organisation client (structure interne)

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-ORG-001** | Socle organisation client | ✅ Implémentée (V1) | Prisma `OrgUnit` / `OrgUnitMembership` / `OrgGroup` / `OrgGroupMembership` (`resourceId` HUMAN obligatoire, `@@unique([clientId, code])` si code renseigné) ; API `GET|POST /api/organization/units`, `PATCH|POST …/archive`, membres `…/units/:id/members` (idem `groups`) ; permissions `organization.read` / `organization.update` / `organization.members.update` ; seed module + rôle global « Client admin — organisation » ; UI `/client/administration/organization` ; audit actions `organization.*` ; voir [RFC](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md) |
| **RFC-ORG-002** | Lien `ClientUser` ↔ `Resource` HUMAN | ✅ Implémentée (MVP) | `ClientUser.resourceId` + `@@unique([resourceId])` ; `GET …/human-resources-catalog` ; `PATCH /api/users/:id` et `PATCH /api/platform/clients/:clientId/users/:userId` (`humanResourceId`) ; `humanResourceSummary` sur listes ; audit `client_user.human_resource.*` ; UI membres + Admin Studio (libellés métier) ; backfill données → [RFC-ACL-023](./RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md) ; plan [_Plan Org & licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md) ; voir [RFC](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md) |
| **RFC-ORG-003** | Propriété organisationnelle des ressources | ✅ Implémentée (V1) | Colonnes `ownerOrgUnitId` (FK `OrgUnit`, index `(clientId, ownerOrgUnitId)`), réponses `ownerOrgUnitSummary` (+ `ownerOrgUnitSource` sur ligne), filtres liste sur colonne stockée, `assertOrgUnitInClient` + archivage unité protégé, audits `project|budget|budget_line|supplier|contract|strategic_objective.ownership.changed` ; UI `OwnerOrgUnitSelect` ; gouvernance V2 → [RFC-ORG-004](./RFC-ORG-004%20%E2%80%94%20Steward%20transfert%20et%20obligation%20ownership.md) (**implémentée V1**) ; voir [RFC](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md) |
| **RFC-ORG-004** | Steward, transfert et obligation ownership | ✅ Implémentée (V1) | `ClientOrgOwnershipPolicy`, `GET|PATCH /api/organization/ownership-policy`, `POST /api/organization/ownership-transfers` (`dryRun` / `confirmApply`), permission `organization.ownership.transfer`, flag `ORG_OWNERSHIP_REQUIRED` ; steward API complet **Projet** ; UI policy + wizard admin org ; extension steward autres modules hors V1 ; voir [RFC](./RFC-ORG-004%20%E2%80%94%20Steward%20transfert%20et%20obligation%20ownership.md) |

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

## 🔄 PHASE 1A+ — CYCLES DE PILOTAGE PROJET

| Ordre | RFC | Nom | Description | État | Commentaire |
| ----- | --- | --- | --- | --- | --- |
| 31a-1 | **RFC-PROJ-CYCLE-001** | Governance Cycles Core Backend | Modèle Prisma, module Nest, RBAC, CRUD cycles/items, scoring, summary | 📝 Draft | [RFC](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) — séparation stricte arbitrage (cycles) / exécution (projects) |
| 31a-2 | **RFC-FE-PROJ-CYCLE-001** | Governance Cycles Frontend UI | Pages `/cycles` et `/cycles/[cycleId]`, matrice arbitrage, dialogs, query keys tenant-aware | 📝 Draft | [RFC](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) — règle UI valeur métier, pas ID |
| 31a-3 | **RFC-PROJ-CYCLE-002** | Project Integration for Governance Cycles | Endpoint `by-project` + bloc lecture seule dans fiche projet | 📝 Draft | [RFC](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) — pas de mutation de `Project.status` |

---

# 🧠 PHASE 1B — PROJETS SCÉNARIOS / BASELINE DÉCISIONNELLE

| Ordre | RFC | Nom | Description | État | Commentaire |
| ----- | --- | --- | --- | --- | --- |
| 31b | **RFC-PROJ-SC-001** | Project Scenario Core | Entité `ProjectScenario`, duplication légère, baseline, archivage logique | ✅ Implémenté (backend MVP) | [RFC](./RFC-PROJ-SC-001%20%E2%80%94%20Project%20Scenario%20Core.md) — module `project-scenarios`, index unique partiel `SELECTED`, résumés `*Summary = null` au MVP |
| 31c | **RFC-PROJ-SC-002** | Scenario Financial Planning | Projection financière scénario alignée sur `ProjectBudgetLink` / core budget | 🟡 Partielle (backend MVP) | [RFC](./RFC-PROJ-SC-002%20%E2%80%94%20Scenario%20Financial%20Planning.md) — Prisma `ProjectScenarioFinancialLine` + routes `/financial-lines` + `/financial-summary`, `budgetSummary` sur détail scénario ; pas de cockpit UI |
| 31d | **RFC-PROJ-SC-003** | Scenario Resource Planning | Charge, période, rôle et coût dérivé par scénario sur `Resource` | ✅ Implémentée (backend MVP) | [RFC](./RFC-PROJ-SC-003%20%E2%80%94%20Scenario%20Resource%20Planning.md) — Prisma `ProjectScenarioResourcePlan`, routes `/resource-plans` + `/resource-summary`, `resourceSummary` alimenté sur le détail scénario, pas de cockpit UI |
| 31e | **RFC-PROJ-SC-004** | Scenario Planning Gantt | Planning autonome par scénario (tâches, jalons, dépendances) | ✅ Implémentée (backend MVP) | [RFC](./RFC-PROJ-SC-004%20%E2%80%94%20Scenario%20Planning%20Gantt.md) — `ProjectScenarioTask`, routes `/tasks`, `/bootstrap-from-project-plan`, `/timeline-summary`, `timelineSummary` alimenté sur le détail scénario |
| 31f | **RFC-PROJ-SC-005** | Scenario Capacity Engine | Calcul charge vs capacité pour juger la faisabilité | ✅ Implémentée (backend MVP) | [RFC](./RFC-PROJ-SC-005%20%E2%80%94%20Scenario%20Capacity%20Engine.md) — snapshots journaliers (`ProjectScenarioCapacitySnapshot`), routes `/capacity`, `/capacity-summary`, `/capacity/recompute`, `capacitySummary` injecté sur le détail scénario |
| 31g | **RFC-PROJ-SC-006** | Scenario Risk Modeling | Risques projetés par scénario, criticité et synthèse | ✅ Implémentée (backend MVP) | [RFC](./RFC-PROJ-SC-006%20%E2%80%94%20Scenario%20Risk%20Modeling.md) |
| 31h | **RFC-PROJ-SC-007** | Scenario Selection Workflow | Sélection atomique de la baseline + endpoint combiné `select-and-transition` (`PLANNED` / `IN_PROGRESS`) | ✅ Implémentée (backend MVP) | [RFC](./RFC-PROJ-SC-007%20%E2%80%94%20Scenario%20Selection%20Workflow.md) — historique MVP via audits, `POST /select` conservé pour compatibilité |
| 31i | **RFC-FE-PROJ-SC-001** | Scenarios Tab UI | Onglet Scénarios dans la fiche projet | ✅ Implémentée (MVP FE) | [RFC](./RFC-FE-PROJ-SC-001%20%E2%80%94%20Scenarios%20Tab%20UI.md) — route dédiée `/projects/[projectId]/scenarios`, actions MVP `create/duplicate/select/archive`, sélection `/select` ou `/select-and-transition` |
| 31j | **RFC-FE-PROJ-SC-002** | Scenario Cockpit UI | Cockpit de comparaison **deux scénarios** (baseline / comparé) sur agrégats détail | ✅ Implémentée (MVP FE) | [RFC](./RFC-FE-PROJ-SC-002%20%E2%80%94%20Scenario%20Cockpit%20UI.md) — `/projects/[projectId]/scenarios/cockpit`, `features/projects/scenario-cockpit/` ; deltas UI uniquement |
| 31k | **RFC-FE-PROJ-SC-003** | Scenario Workspace | Édition scénario : onglets locaux, PATCH métadonnées, affichage summaries API | ✅ Implémentée (MVP FE) | [RFC](./RFC-FE-PROJ-SC-003%20%E2%80%94%20Scenario%20Workspace%20.md) — `/projects/[projectId]/scenarios/[scenarioId]`, `features/projects/scenario-workspace/` ; sans comparaison multi-scénarios (cockpit séparé) |

*(Roadmap détaillée : [_Plan de déploiment - Projetscenario](./_Plan%20de%20d%C3%A9ploiment%20-%20Projetscenario.md).)*

---

# ⚙️ PHASE 2 — BUDGET PRÉVISIONNEL

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-023** | Budget Prévisionnel (Planning & Atterrissage) | ✅ Implémenté (MVP) | [RFC](./RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md) — préfixe API `/api/budget-lines/:id/planning`, package `packages/budget-exercise-calendar`, journal [CHANGELOG.md](../../CHANGELOG.md) (alias DTO, audit canonique). *Ne pas confondre avec [RFC-023 — Client RBAC Administration](./RFC-023%20—%20Client%20RBAC%20Administration.md).* |
| **RFC-024** | Budget UI (Prévisionnel / Atterrissage / Forecast) | 🟡 Spec Draft — **impl. partielle** | [RFC](./RFC-024%20%E2%80%94%20Budget%20UI.md) — tableau explorateur `/budgets/[budgetId]` : onglets pilotage, grille 12 mois, colonnes tête dont **% écart prév.** (voir §5) ; pas d’endpoint dédié (lecture dérivée). *Voir aussi [RFC-024 — Budget Line Planning Engine](./RFC-024%20%E2%80%94%20Budget%20Line%20Planning%20Engine.md) (moteur).* |
| **RFC-FE-BUD-030** | Forecast & Comparaison budgétaire UI | ✅ Implémenté (MVP) | [RFC](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md) — `/budgets/[budgetId]/reporting`, lien cockpit, enveloppe, onglet forecast ; API `budget-forecast`, `budget-comparisons`, listes snapshots / version-history |
| **RFC-032** | Historisation décisions budgétaires | ✅ Implémenté (MVP) | [RFC](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) — `GET /api/budgets/:budgetId/decision-history`, audits sémantiques §4.1.5, whitelist dont `budget.workflow_snapshot.failed`, onglet « Décisions » fiche budget ; lecture `AuditLog` via `BudgetDecisionHistoryService` |
| **RFC-033** | Versions budgétaires (produit) — version figée = snapshot | 🟢 Implémenté (MVP) | [RFC](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) — liste/détail/création manuelle + **captures auto Soumis / Validé**, types d’occasion (global + client), admin plateforme ; distinct des révisions RFC-019 |

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
| **RFC-PROJ-SC-001 → 007** | **Simulation projet / baseline / arbitrage** : vraie couche décisionnelle avant exécution |
| **RFC-FE-PROJ-014** (suite) | Finitions **fiche** (UX arbitrage CODIR, scénarios avancés) si hors périmètre MVP actuel |
| **RFC-PROJ-010** suite | **KPI budget projet** (ligne 13 — partiel) |
| **RFC-RES-002** | Coût réel / affectation ressources |

---

## Strategic Vision / Strategy Board

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-STRAT-001** | Strategic Vision Core Backend | ✅ Implémentée (MVP backend) | Socle backend livré : module `strategic-vision`, schéma Prisma, API vision/axes/objectifs/liens, guards standards, permissions `strategic_vision.*`, audit ; MVP `PROJECT` actif, `BUDGET`/`RISK` rejetés (`not supported in MVP`) |
| **RFC-STRAT-002** | Strategic Vision KPI and Alignment Engine | ✅ Implémentée (MVP backend) | Endpoint `GET /api/strategic-vision/kpis` livré (guards standards + `strategic_vision.read`), 5 KPI backend calculés et client-scopés, index perf ajoutés ; UI/alerts restent dans RFC-STRAT-003/004 |
| **RFC-STRAT-003** | Strategic Vision Frontend UI | 🟡 Implémentée (MVP FE + évolutions cockpit) | Route `/strategic-vision`, onglets (query `tab=`) dont **Directions** référentiel et **Vision entreprise** ; sidebar **Vision stratégique** déroulante (**Vision Entreprise** `?tab=enterprise`, lien **Stratégie** → `/strategic-direction-strategy`). Query keys tenant-aware ; valeur métier en UI ; périmètre historique RFC (create/objectifs/manage_links hors MVP initial) inchangé — voir compléments dans la RFC |
| **RFC-STRAT-004** | Strategic Vision Alerts and CODIR Widgets | ✅ Implémentée (MVP) | Endpoint `GET /api/strategic-vision/alerts` (guards standards + `strategic_vision.read`), section `StrategicAlertsPanel` côté page `/strategic-vision`, widgets CODIR alignés RFC dont `Strategic Drift` en composite visuel UI basé sur les KPI STRAT-002 (contrat `/kpis` inchangé) |
| **RFC-STRAT-005** | Stratégie par direction et vision stratégique | ✅ Implémentée (MVP) | Référentiel `StrategicDirection`, CRUD UI onglet **Directions**, `DELETE /api/strategic-directions/:id` protégée (pas de suppression si stratégies de direction liées), `StrategicObjective.directionId`, KPI par direction et alertes filtrées ; `Project` via `StrategicLink` uniquement |
| **RFC-STRAT-006** | Stratégie par direction métier | ✅ Implémentée (MVP phase 2) | Module Nest `strategic-direction-strategy`, UI `/strategic-direction-strategy`, entrée sidebar sous **Vision stratégique › Stratégie** ; workflow CODIR via `/api/strategic-direction-strategies*` ; liens vision↔axes↔objectifs (`GET /:id/links`, `PUT …/axes`, `PUT …/objectives`) ; adaptation d’une stratégie `APPROVED` via `PATCH` + `archiveReason` (snapshot auto `ARCHIVED`) ; `strategic_direction_strategy.*` ; aucune route stratégie sous `/api/strategic-vision` |
| **RFC-STRAT-007** | Vision stratégique V1 — Core backend et modèle de données | ✅ Implémentée (backend V1 additive) | Socle backend V1 livré : migrations Prisma (enums + backfill), DTOs enrichis, routes imbriquées + compat routes plates, archivage logique vision/axe/objectif, RBAC `strategic_vision.delete`, liens write V1 `PROJECT`/`MANUAL` (autres types refusés) |
| **RFC-STRAT-008** | Vision stratégique V1 — KPI et alertes de désalignement | ✅ Implémentée (backend V1) | Endpoints `GET /api/strategic-vision/kpis` et `GET /api/strategic-vision/alerts` alignés V1 : `PROJECT_UNALIGNED` (severity `MEDIUM`), IDs déterministes, tri stable, `createdAt` dérivé ressource, filtres `directionId`/`unassigned`, exclusion projets `ARCHIVED`/`CANCELLED`/`COMPLETED` via `activePortfolioProjectsWhere` |
| **RFC-STRAT-009** | Vision stratégique V1 — Frontend cockpit et UX | ✅ Implémentée (Frontend V1) | Cockpit `/strategic-vision` aligné V1: onglets incluant **Alertes** + **Historique** (placeholder explicite), data-layer progressive (`api` + `queries` + `mutations` + hooks façade), query keys RFC tenant-aware, labels FR métier (pas d’ID brut), validation Zod formulaires vision/axe/objectif, tests FE anti-régression |
| **RFC-STRAT-010** | Vision stratégique V1 — Plan de tests et trajectoire de delivery | 🟡 En cours (implémentation V1) | Delivery/QA actif : correction layout cockpit `/strategic-vision`, StrategicLink UI + invalidations KPI/alertes, filtres liste vision backend, hardening tests et garde-fous multi-client |
| **PLAN-DEV-STRATEGIC-VISION** | Plan de développement ordonné | 📝 Draft | Plan en 11 phases (0→10), dépendances, risques, critères de sortie et préparation V2 |

---

## Licences, abonnements et ACL

| RFC | Nom | État | Commentaire |
| --- | --- | --- | --- |
| **RFC-ACL-001** | Abonnements et licences client | ✅ Implémentée (backend MVP) | Socle subscriptions + quotas + licence sur `ClientUser` livré backend (Prisma, migration, services, endpoints plateforme/client, `LicenseWriteGuard` ciblé) ; déploiement global guard + cockpit FE hors scope ; voir [RFC](./RFC-ACL-001%20%E2%80%94%20Abonnements%20et%20licences%20client.md) |
| **RFC-ACL-002** | Licences spéciales et évaluation | ✅ Implémentée (backend) | Matrice de couples licence stricte, règles `subscriptionId`/motif/date, blocage write sur expiration, compatibilité backfill ACL-001 et tests ACL-002 ; voir [RFC](./RFC-ACL-002%20%E2%80%94%20Licences%20sp%C3%A9ciales%20et%20%C3%A9valuation.md) |
| **RFC-ACL-003** | Groupes d’accès client | ✅ Implémentée (MVP) | Référentiel client-scopé livré (`AccessGroup`, `AccessGroupMember`), API `/api/access-groups*` (admin client + client actif), audit `access_group.*`, UI `/client/access-groups` (liste + détail + membres) ; pas de branchement permissions métier dans ce lot ; voir [RFC](./RFC-ACL-003%20%E2%80%94%20Groupes%20d%E2%80%99acc%C3%A8s%20client.md) |
| **RFC-ACL-004** | Visibilité des modules | ✅ Implémentée (MVP) | Prisma `ClientModuleVisibility`, API `GET|PATCH|DELETE /api/module-visibility` (CLIENT_ADMIN + client actif), résolution effective dans `ModuleVisibilityService`, enforcement via `ModuleAccessGuard` + `EffectivePermissionsService`, `visibleModuleCodes` sur `GET /me/permissions`, UI `/client/administration/module-visibility`, filtre sidebar ; voir [RFC](./RFC-ACL-004%20%E2%80%94%20Visibilit%C3%A9%20des%20modules.md) |
| **RFC-ACL-005** | ACL ressources génériques | ✅ Implémentée (backend MVP) | Prisma `ResourceAcl`, API `/api/resource-acl/*` (**CLIENT_ADMIN**), `resolveResourceAclRoute` (validation unique pré-Prisma), whitelist `resourceType` V1 + CUID `resourceId`, `AccessControlModule` dans **`AppModule`** (pas `CommonModule`), `ResourceAclGuard`, audit `resource_acl.*` (snapshots exploitables replace/delete), cleanup groupe ; **UI éditeur contextuel = RFC-ACL-013** ; hors portail transverse RFC-ACL-007 ; hors branchement métier RFC-ACL-006 ; [_plan dev §18.1](./_plan_developpement_licences_abonnements_acl_starium.md) ; [RFC](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) |
| **RFC-ACL-006** | Intégration ACL dans les modules métier | ✅ Implémentée (backend V1) | ACL branchée sur Projects/Budgets/Budget-lines (héritage parent)/Contracts/Suppliers/Documents hérités/Strategic Objective, helper batch `filterReadableResourceIds`, anti N+1 ; **UI éditeur contextuel = RFC-ACL-013** (hors portail transverse RFC-ACL-007) ; voir [RFC](./RFC-ACL-006%20%E2%80%94%20Int%C3%A9gration%20ACL%20dans%20les%20modules%20m%C3%A9tier.md) |
| **RFC-ACL-007** | Frontend administration ACL | 📝 Draft | Écrans admin plateforme/client pour licences, abonnements, groupes, visibilité et ACL ; voir [RFC](./RFC-ACL-007%20%E2%80%94%20Frontend%20administration%20ACL.md) |
| **RFC-ACL-008** | Audit et traçabilité avancée ACL | 📝 Draft | Normalisation des événements audit et payloads old/new pour tout le périmètre ACL ; voir [RFC](./RFC-ACL-008%20%E2%80%94%20Audit%20et%20tra%C3%A7abilit%C3%A9%20avanc%C3%A9e%20ACL.md) |
| **RFC-ACL-009** | Expiration automatique et jobs | ✅ Implémentée (backend MVP) | Cron + BullMQ (`license_expiration_scan`) : expiration abonnement/licences, downgrades explicites, audits transactionnels (`client_subscription.expired`, `client_user.license.*_expired`), notifications admin dédupliquées ; voir [RFC](./RFC-ACL-009%20%E2%80%94%20Expiration%20automatique%20et%20jobs.md) |
| **RFC-ACL-010** | UX cockpit licences et droits | ✅ Implémentée (V1) | Cockpits client + plateforme (KPI quotas, distribution, expirations, filtres, quick-actions) ; nouvel endpoint `GET /api/platform/clients/:clientId/users` isolé du client actif ; `UserResponse` étendu (`licenseStartsAt/EndsAt/AssignmentReason`) ; quick-actions sous fallback rôle documenté (dette technique tant qu’aucune permission API dédiée) ; aucune route obsolète `/client/access-groups` exposée dans l’UI ; voir [RFC](./RFC-ACL-010%20%E2%80%94%20UX%20cockpit%20licences%20et%20droits.md) |
| **RFC-ACL-011** | Matrice des droits effectifs | ✅ Implémentée (V1) | Vue diagnostic “pourquoi accès/refus” sur l’intersection licence/module/RBAC/ACL ; endpoints client + plateforme et UI dédiée ; voir [RFC](./RFC-ACL-011%20%E2%80%94%20Matrice%20des%20droits%20effectifs.md) |
| **RFC-ACL-012** | Commercialisation et reporting licences | ✅ Implémentée (V1) | Module backend `license-reporting` (PlatformAdminGuard, overview/clients/monthly + exports CSV/JSON), feature web `/admin/license-reporting` (KPI cards + trajectoire mensuelle + table par client + filtres clientId/mode/statut/période), dictionnaire KPI canonique partagé API↔UI, libellés métier (`clientName`/statuts/modes), anti-fuite `clientId` ; pas de table d'agrégats persistée en V1 ; voir [RFC](./RFC-ACL-012%20%E2%80%94%20Commercialisation%20et%20reporting%20licences.md) |
| **RFC-ACL-013** | Éditeur ACL par ressource (UI) | ✅ Implémentée (V1 — frontend) | Feature `apps/web/src/features/resource-acl/` (`ResourceAclEditor`, dialog, trigger **CLIENT_ADMIN** uniquement) ; clés tenant-aware ; self-lockout + DELETE séquentiel + `refetch` ; intégrations Projects, Contracts, Suppliers, Budgets, drawer ligne budget, cartes objectifs stratégiques ; [RFC](./RFC-ACL-013%20%E2%80%94%20%C3%89diteur%20ACL%20par%20ressource.md) |
| **RFC-ACL-014** | Conformité modèle Rôles+Groupes+ACL (six contrôles + lockout) | ✅ Implémentée (V1) | Registre `RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY` ; lockout `RESOURCE_ACL_LAST_ADMIN_LOCKOUT` + audits `resource_acl.lockout_blocked` / `force_*` ; mutations `PUT|POST|DELETE` `/api/resource-acl/*` en Option A (`PLATFORM_ADMIN` + `X-Client-Id`, query `force`) ; `GET` liste ACL inchangé **CLIENT_ADMIN** ; self-service `GET /api/access-diagnostics/effective-rights/me` (`intent`, `ALLOWED`/`DENIED`/`UNSAFE_CONTEXT`, audit `access_diagnostic.self_outcome`) ; `/me/permissions` + `roles[]` informatif ; UI « Accès à la ressource » + `AccessExplainerPopover` + `/client/help/access-model` ; [RFC](./RFC-ACL-014%20%E2%80%94%20Conformit%C3%A9%20mod%C3%A8le%20R%C3%B4les%2C%20Groupes%20et%20ACL.md), [ACCESS-MODEL.md](../ACCESS-MODEL.md) |
| **RFC-ACL-015** | Permissions `OWN` / `SCOPE` / `ALL` | 🟡 Partielle (socle) | Package `packages/rbac-permissions` (`satisfiesPermission`, seed rows), guards + diagnostics + `GET /me/permissions` (`uiPermissionHints`) ; enforcement guards HTTP V1 → [RFC-ACL-024](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) ; voir [RFC](./RFC-ACL-015%20%E2%80%94%20Permissions%20OWN%20SCOPE%20ALL.md) |
| **RFC-ACL-016** | Résolution du scope organisationnel | 🟡 Service livré — consommé par 018/020 | `OrganizationScopeService` ; consommé par moteur **018** sur modules branchés **020** (si flag V2) ; diagnostic **019** si enrichi ; voir [RFC](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) |
| **RFC-ACL-017** | Politique d’accès ressource (DEFAULT / RESTRICTIVE / SHARING) | ✅ Implémentée (V1) | Prisma `ResourceAccessPolicy` ; `evaluateResourceAccessDecision` ; `GET` + `PATCH .../access-policy` ; réponse liste `accessPolicy` + `effectiveAccessMode` ; audit `resource_access_policy.changed` ; UI éditeur ; matrice **consommée** par le moteur [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md) (`AccessControlService` + batch) ; [RFC](./RFC-ACL-017%20%E2%80%94%20Politique%20d%27acc%C3%A8s%20ressource.md) |
| **RFC-ACL-018** | Moteur de décision d’accès unifié | ✅ Implémentée | Module `access-decision/` : `AccessDecisionService`, read/write intents, registre (`BUDGET_LINE` → budget parent) ; branchement modules via **020** + flags **022** ; adoption guards HTTP → [RFC-ACL-025](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md) ; voir [RFC](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md) |
| **RFC-ACL-019** | Diagnostic enrichi (organisation + propriété + politique) | ✅ Implémentée (V1 — flag) | Opt-in `ACCESS_DIAGNOSTICS_ENRICHED` ; **read** = `decide` ; write/admin via moteur si enrichi + flag module **020** ; registre `BUDGET_LINE` ; voir [RFC](./RFC-ACL-019%20%E2%80%94%20Diagnostic%20enrichi%20organisation%20et%20acc%C3%A8s.md) |
| **RFC-ACL-020** | Intégration modules métier (ownership + scope) | ✅ Implémentée (activation prod couplée 022) | Moteur read/write/admin + flags par module ; UI ownership Suppliers/Contracts/StrategicObjective ; tests `access-decision.modules.integration.spec.ts` ; [runbook](../runbooks/migration-org-scope-access.md) ; voir [RFC](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) |
| **RFC-ACL-021** | Cockpit « modèle d’accès » admin client | ✅ Implémentée (V1) | Module `access-model` ; `GET /api/access-model/health` (KPI + `rollout[]` cockpit) + `GET /api/access-model/issues` ; permission `access_model.read` ; UI `/client/administration/access-model` ; V2 export/checklist → [RFC-ACL-026](./RFC-ACL-026%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%20acc%C3%A8s%20V2.md) ; voir [RFC](./RFC-ACL-021%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%27acc%C3%A8s%20admin%20client.md) |
| **RFC-ACL-022** | Migration, backfill et feature flags | ✅ Implémentée (socle) | `ClientFeatureFlag`, `FeatureFlagsService`, CLI `backfill-owner-org-unit.ts`, runbook ; backfill HUMAN → [RFC-ACL-023](./RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md) ; activation prod **par client et par module** ; voir [RFC](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) |
| **RFC-ACL-023** | Backfill `ClientUser` ↔ HUMAN | ✅ Implémentée | CLI `--dry-run` / `--apply`, matcher + runner, CSV 11 colonnes, audit batch ; runbook §0 ; voir [RFC](./RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md) |
| **RFC-ACL-024** | Enforcement permissions scoped | ✅ Implémentée (V1) | `@RequireAccessIntent`, `access-intent.registry`, `SERVICE_ENFORCED_REGISTRY`, guards + pont legacy restreint, `accessDecisionV2` sur `/me/permissions`, diagnostics `seededButRouteNotMigrated` ; vague 1 controllers 020 ; satellites → checklist runbook ; voir [RFC](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) |
| **RFC-ACL-025** | Adoption guards HTTP moteur unifié | 📝 Draft | `ResourceAccessDecisionGuard` + `@AccessDecision` sur controllers modules 020 ; voir [RFC](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md) |
| **RFC-ACL-026** | Cockpit modèle d’accès V2 | 📝 Draft | Export CSV issues, checklist rollout UI ; suite [RFC-ACL-021](./RFC-ACL-021%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%27acc%C3%A8s%20admin%20client.md) ; voir [RFC](./RFC-ACL-026%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%20acc%C3%A8s%20V2.md) |

