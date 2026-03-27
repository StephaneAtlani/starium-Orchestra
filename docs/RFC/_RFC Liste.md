
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




---

# 🔥 PHASE 1 — MODULE PROJET (PRIORITÉ ABSOLUE)

## 🧱 BACKEND — PROJET

| Ordre | RFC              | Nom                 | Description                                                     | État      | Commentaire        |
| ----- | ---------------- | ------------------- | --------------------------------------------------------------- | --------- | ------------------ |
| 1     | **RFC-PROJ-001** | Cadrage fonctionnel | Définition du périmètre projet (projet, tâche, risque, cockpit) | ✅ Couvert | Base MVP OK        |
| 2     | **RFC-PROJ-002** | Prisma Schema       | Modélisation DB : Project, Task, Risk, Milestone                | ✅ Couvert | Structure OK       |
| 3     | **RFC-PROJ-003** | Règles métier       | Calcul health, statuts, cohérence projet                        | ✅ Couvert | Service existant   |
| 4     | **RFC-PROJ-004** | Portfolio API       | CRUD projets + agrégats portefeuille                            | ✅ Couvert | `/api/projects` OK |

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
| 8     | **RFC-PROJ-012** | Project Sheet          | Objet décisionnel lié au projet                                  | 🟡 En cours | modèle étendu OK           |
| 9     | **RFC-PROJ-012** | Project Sheet API      | GET / PATCH fiche projet                                         | 🟡 En cours | permissions OK             |
| 10    | **RFC-PROJ-012** | Project Sheet Metrics  | Calcul backend : coût, budget, ROI, forecast                     | ❌ À faire   | dépend budget + ressources |
| 11    | **RFC-PROJ-012** | Project Decision Rules | Règles d’arbitrage (APPROVED / REJECTED / ON_HOLD / TO_VALIDATE) | ❌ À faire   | critique gouvernance       |

---

## 🔗 BACKEND — LIENS CRITIQUES

| Ordre | RFC              | Nom                | Description                                    | État       | Commentaire             |
| ----- | ---------------- | ------------------ | ---------------------------------------------- | ---------- | ----------------------- |
| 12    | **RFC-PROJ-010** | Project ↔ Budget   | Lier projets aux lignes/enveloppes budgétaires | ✅ Couvert  | base OK                 |
| 13    | **RFC-PROJ-010** | Project Budget KPI | Exposer KPI budget projet                      | ⚠️ Partiel | nécessaire fiche projet |
| 14    | **RFC-PROJ-011** | Tasks / Activities | Tâches, activités, jalons, Gantt backend       | ✅ Couvert  | OK                      |
| 14b   | **RFC-PROJ-017** | Project Tags       | Référentiel d’étiquettes + assignation projet  | ✅ Couvert  | options + fiche + liste |
| 14c   | **RFC-PROJ-DOC-001** | ProjectDocument | Registre métier documents projet (Prisma + API + audit) | ✅ Couvert | MVP : pas d’upload binaire ; UI liste read-only fiche ; voir [RFC-PROJ-DOC-001](./RFC-PROJ-DOC-001%20—%20Modèle.md) |
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
| 2 | **RFC-PROJ-INT-002** | Prisma Schema | Modèles `MicrosoftConnection`, `ProjectMicrosoftLink`, sync tâches | 🟡 Partiel | `MicrosoftConnection` + enums en base ; `ProjectMicrosoftLink` / sync tâches non migrés |
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
| 18    | **RFC-FE-PROJ-001** | Portfolio List UI | Vue globale projets (liste) | ✅ Couvert | `/projects` |

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
| 24    | **RFC-FE-PROJ-014** | Project Sheet UI  | Fiche projet décisionnelle     | ❌ À faire  | **urgence absolue** |
| 25    | **RFC-FE-PROJ-003** | Tasks UI          | Interface tâches               | ✅ Couvert  | stable              |
| 26    | **RFC-FE-PROJ-004** | Risks UI          | Interface risques              | ✅ Couvert  | stable              |
| 27    | **RFC-FE-PROJ-005** | Resources UI      | Vue ressources                 | ❌ À faire  | dépend RES          |
| 28    | **RFC-FE-PROJ-006** | Budget Links UI   | Visualisation budgets          | ⚠️ Partiel | OK partiel          |
| 29    | **RFC-FE-PROJ-007** | Supplier Links UI | Visualisation fournisseurs     | ❌ À faire  | futur               |
| 30    | **RFC-FE-PROJ-011** | Project Health UI | Indicateurs santé              | ✅ Couvert  | OK                  |
| 31    | **RFC-PROJ-OPT-001** | Project Options UI | Onglets Général / Planning (buckets) / Microsoft 365 / Sync ; liaison projet ; option buckets Planner ; sync manuelle | ✅ Implémenté | [RFC](./RFC-PROJ-OPT-001%20—%20Project%20Options.md) — `apps/web/src/features/projects/options/` |

---

# ⚙️ PHASE 2 — BUDGET PRÉVISIONNEL

(SANS CHANGEMENT — cohérent avec ton plan actuel)

---

# 🔗 PHASE 3 — FUSION PROJET + BUDGET

(SANS CHANGEMENT — cohérent)

---

# 🚨 SYNTHÈSE AJUSTÉE

## 🔥 À FAIRE MAINTENANT (CRITIQUE RÉEL)

| RFC                    | Pourquoi                                |
| ---------------------- | --------------------------------------- |
| **RFC-PROJ-014 → 016** | **STRUCTURE PORTEFEUILLE (catégories)** |
| **RFC-PROJ-012**       | Fiche projet décisionnelle              |
| **RFC-FE-PROJ-014**    | UI arbitrage CODIR                      |
| **RFC-PROJ-010 suite** | KPI budget projet                       |
| **RFC-RES-002**        | coût ressources                         |

