# Plan de développement — Cycles de pilotage

> **Dernière révision** : 2026-06-01  
> **Statut global** : **V1 + V2 livrés** — [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) **B1–B9** ; [RFC-FE-PROJ-CYCLE-001](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) ; [RFC-PROJ-CYCLE-002](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) (2026-05-30) ; [RFC-PROJ-CYCLE-003](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md) lots **003-A–F** (2026-06-01, hors **003-G**).  
> **Principe produit** : **Projet = exécuter** · **Cycle = arbitrer** · **Instance = décider à une date**

Ce document est le **plan d’exécution** consolidé. **Tu travailles par numéro de RFC** (fichiers dans `docs/RFC/`) ; les anciens codes « lots » (B1, F3, I1…) restent en **annexe** pour lecture historique uniquement.

---

## 1. Audit de la documentation (2026-05-19)

### 1.1 Documents de référence (RFC)

| RFC | Fichier | Rôle | État |
| --- | ------- | ---- | ---- |
| **RFC-PROJ-CYCLE-001** | [Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) | Backend : Prisma, module Nest, RBAC, API cycles/items, scoring, summary, audits, by-project | ✅ Implémenté (B1–B9, 2026-05-30) |
| **RFC-FE-PROJ-CYCLE-001** | [Governance Cycles Frontend UI](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) | UI `/cycles`, matrice, navigation | ✅ Implémenté (2026-05-30) |
| **RFC-PROJ-CYCLE-002** | [Project Integration for Governance Cycles](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) | `by-project` + bloc fiche projet read-only | ✅ Implémenté (2026-05-30) |
| **RFC-PROJ-CYCLE-003** | [Governance Cycle Instances and Configurable Propagation](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md) | Instances, agenda, clôture, candidature, config, propagation projet/budget, génération trimestres | ✅ Implémenté (003-A–F, 2026-06-01) |
| [_RFC Liste](./_RFC%20Liste.md) § Phase 1A+ | Index 31a-1 → 31a-4 | Statuts index | À jour (003 ajoutée) |
| [_Plan legacy Cycle projets](./_%20Plan%20de%20d%C3%A9veloppement%20-%20%20Cycle%20projets.md) | Doublon historique | ⚠️ Ne pas utiliser comme source |

### 1.2 Écarts doc ↔ code (vérification repo — 2026-05-30)

| Attendu (RFC) | État réel dans le repo |
| ------------- | ---------------------- |
| **RFC-PROJ-CYCLE-001** §4.1 / §5 — modèles + migration | ✅ `schema.prisma` + `migrations/20260528120000_governance_cycles_core/` — `prisma migrate deploy` (supprimer dossier vide `20260520120000_governance_cycles_core` si P3015) |
| **RFC-PROJ-CYCLE-001** §3 — module Nest | ✅ `apps/api/src/modules/governance-cycles/` |
| **RFC-PROJ-CYCLE-001** §4.2 — RBAC + seed | ✅ `seed.ts`, `default-profiles.json` |
| **RFC-PROJ-CYCLE-001** §4.3–4.4 — CRUD cycles | ✅ 5 routes — [API.md](../API.md) §5.8 |
| **RFC-PROJ-CYCLE-001** §4.3 — `summary` **embarqué** (liste + détail cycle) | ✅ Champ `summary` sur `GET /governance-cycles` et `GET /governance-cycles/:id` — `itemsCount`, `acceptedItemsCount`, `deferredItemsCount` ; calcul `getSummaryForCycle` / `buildSummariesForCycles` |
| **RFC-PROJ-CYCLE-001** §4.3–4.4 — CRUD items | ✅ |
| **RFC-PROJ-CYCLE-001** §4.5 — scoring | ✅ `governance-cycle-scoring.util.ts`, `hasScorePatch`, specs DTO ValidationPipe |
| **RFC-PROJ-CYCLE-001** §4.3 — route **`GET /api/governance-cycles/:id/summary`** (lot B7) | ✅ `GovernanceCycleGlobalSummaryDto` — handler + service + tests + [API.md](../API.md) §5.8 |
| **RFC-PROJ-CYCLE-001** §6 — audits items + tests backend complets | ✅ (audits cycle validated/closed, règles TO_ARBITRATE/CLOSED, tests B8–B9 — 88 tests module) |
| **RFC-FE-PROJ-CYCLE-001** — UI `/cycles` | ✅ |
| **RFC-PROJ-CYCLE-002** — `GET …/by-project/:projectId` + bloc projet | ✅ |

> **Lexique `summary` (ne pas confondre)**  
> - **Embarqué ✅ (B4)** : objet `summary` inclus dans la réponse cycle (liste et détail). Suffit pour la liste `/cycles` et le header détail.  
> - **Route dédiée ✅ (B7)** : `GET /api/governance-cycles/:id/summary` — ressource KPI autonome (`GovernanceCycleGlobalSummaryDto`, contrat distinct du `summary` embarqué). Recommandée pour l’onglet KPI overview FE.

### 1.3 Corrections documentaires à retenir pour l’implémentation

- **Risques** : l’entité métier projet est `ProjectRisk` (pas un modèle `Risk` global) — les FK `riskId` sur `GovernanceCycleItem` doivent pointer vers `ProjectRisk` avec contrôle `project.clientId = client actif.
- **Endpoint projet** : exposer `GET /api/governance-cycles/by-project/:projectId` côté **governance-cycles** uniquement (**RFC-PROJ-CYCLE-002**), pas sous `/api/projects/...`.
- **Décision d’arbitrage (V1)** : portée par `GovernanceCycleItem.decisionStatus` — **pas** de sync vers `Project` en V1. **V2 (RFC-003)** : décisions par **instance** + propagation **paramétrable** (`NONE` par défaut) — voir §4.6.
- **Profils globaux** : ajouter au minimum `governance_cycles.read` aux rôles « Directeur », « Chef de projet », profils Strategic Board selon politique produit ; créer un profil dédié « Gestionnaire cycles de pilotage » si besoin CODIR.

### 1.4 Écrans complémentaires (proxies historiques)

La couche **cycle de pilotage** est disponible via **`/cycles`** ([RFC-FE-PROJ-CYCLE-001](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md)). Les écrans ci-dessous restent utiles mais **ne remplacent pas** l’objet « cycle » transverse :

| Besoin schéma produit | Écran actuel | Limite vs `/cycles` |
| --------------------- | ------------ | --------------------- |
| Présentation CODIR (1 projet) | `/projects/committee/codir` | Pas de matrice multi-candidats ni retenu/différé structuré au niveau portefeuille |
| Synthèse décisionnelle | `/projects/[id]/sheet` | Pas de rattachement à une cadence / période de cycle |
| Comparaison scénarios | `/projects/[id]/scenarios/cockpit` | Arbitrage scénario, pas portefeuille |
| Vision / budget / risques | Modules dédiés | Pas de couche transverse d’arbitrage (complémentaire aux cycles) |

Référence manuel : `docs/MANUEL-40-PROJETS-RISQUES-ACTIONS.md` §7.4 (CODIR).

---

## 2. Position produit (cible)

Couche **transverse de gouvernance** entre les entrées stratégiques / financières et l’exécution projet :

```text
Entrées          →  Cycle (programme)           →  Instance (décision datée)  →  Exécution
──────────────────────────────────────────────────────────────────────────────────────────
Vision, objectifs     Portefeuille candidats         Réunion / vote / PV           Projets, budgets
Budget, capacité      Projets + budgets              Retenir / différer            (effet aval si config)
Risques               Scores, matrice                Clôture instance
```

**V1 livré** : un cycle = un dossier plat (matrice continue). **V2 cible (RFC-003)** : cycle = **programme** (ex. arbitrage trimestriel projets + budget) ; **instances** = T1, T2… avec `scheduledDecisionAt` ; à la clôture, décisions figées et **propagation optionnelle** vers projet / budget.

**Cadences** (enum `GovernanceCycleCadence`) : libellé du programme — la **planification** des instances repose sur `governanceConfig.instanceSchedule` (RFC-003), pas sur la cadence seule.

**Types d’items V1** (priorité d’implémentation, **RFC-PROJ-CYCLE-001**) :

1. `PROJECT` — MVP indispensable  
2. `MANUAL` — éléments hors référentiel  
3. `BUDGET` — lien budget / enveloppe  
4. `STRATEGIC_OBJECTIVE`, `BUDGET_LINE`, `RISK` — extension post-MVP si charge OK  

---

## 3. Architecture technique (rappel)

- **API** : REST sous `/api/governance-cycles`, préfixe global Nest existant.
- **Multi-client** : `clientId` dérivé du client actif ; jamais dans les DTO write ; filtrage systématique.
- **Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.
- **Frontend** : `apps/web/src/features/governance-cycles/` + routes App Router ; TanStack Query avec `clientId` dans les query keys.
- **Audit** : événements listés en **RFC-PROJ-CYCLE-001** §6 (RFC-013).
- **Références** : [ARCHITECTURE.md](../ARCHITECTURE.md), [RFC-011](./RFC-011-roles-permissions-modules.md), [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md).

---

## 4. Plan d’exécution par RFC (référence principale)

**Ordre recommandé** : **RFC-PROJ-CYCLE-001** → **RFC-FE-PROJ-CYCLE-001** → **RFC-PROJ-CYCLE-002** → **RFC-PROJ-CYCLE-003** lots **003-A → 003-F** (**livré** 2026-06-01). Extension ultérieure : lot **003-G** (décideurs nommés).

### 4.1 RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend

**Fichier** : [RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md)

**Calquer** : `apps/api/src/modules/strategic-vision/` (Nest), module existant `apps/api/src/modules/governance-cycles/`.

| Ordre | Section RFC | Contenu | Critères d’acceptation (résumé) | État |
| ----- | ----------- | ------- | -------------------------------- | ---- |
| 1 | §4.1, §5 | Prisma + migration `governance_cycles_core` | `prisma migrate` OK ; FK ; `@@unique([cycleId, projectId])` | ✅ |
| 2 | §3 | Module Nest (`governance-cycles.module`, `app.module`) | Boot ; DTOs cycles + items | ✅ |
| 3 | §4.2 | RBAC `governance_cycles.*` + seed + profils | Permissions + module client activable | ✅ |
| 4 | §4.3–4.4 | **CRUD cycles** (5 endpoints) | Liste `{ items, total, limit, offset }` ; DELETE → ARCHIVED **204** ; pas de `clientId` en body | ✅ |
| 4b | §4.3 | **`summary` embarqué** | Champ `summary` sur liste + détail cycle ; agrégats `itemsCount` / `acceptedItemsCount` / `deferredItemsCount` ; pas de N+1 grossier en liste | ✅ |
| 5 | §4.3–4.4 | **CRUD items** (5 endpoints sous `:id/items`) | `sourceType` + FK ; doublon projet → 409 ; PATCH mixte → 400 ; pas de mutation `Project` | ✅ |
| 6 | §4.5 | Scoring `priorityScore` | Formule RFC ; 1–5 ; recalcul create ; update si clé score (`hasScorePatch`) ; `priorityScore` jamais en body ; backend only | ✅ |
| 7 | §4.3 | **Route** `GET /api/governance-cycles/:id/summary` (**B7**) | `GovernanceCycleGlobalSummaryDto` ; 3 requêtes Prisma parallèles ; **404** hors client ; permission `governance_cycles.read` ; doc `API.md` ; tests controller/service | ✅ |
| 8 | §6 | Audits items + tests backend complets | `governance_cycle_item.*` ✅ ; audits `validated`/`closed` + règles transitions ✅ ; B9 `by-project` (RFC-002) ✅ ; 88 tests module | ✅ |

**Durée indicative** : 1,5–2 sprints backend (équipe familière du repo).

---

### 4.2 RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI

**Fichier** : [RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md)

**Prérequis** : **RFC-PROJ-CYCLE-001** §4.3–4.5 + **B7 KPI global** — **livré**.

**Calquer** : `apps/web/src/features/strategic-vision/`, [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md).

| Ordre | Section RFC | Contenu | Critères d’acceptation (résumé) | État |
| ----- | ----------- | ------- | -------------------------------- | ---- |
| 1 | §4.2 | Feature skeleton `features/governance-cycles/` | api, hooks, query keys avec `clientId` | ✅ |
| 2 | §4.1 | Navigation → `/cycles` | Masqué si module off ou sans `governance_cycles.read` | ✅ |
| 3 | §4.3 | Liste `/cycles` | Filtres, pagination, création ; libellés FR, pas d’UUID en colonnes | ✅ |
| 4 | §4.4 | Détail `/cycles/[id]` | Header, onglets (overview + matrice minimum) | ✅ |
| 5 | §4.5 | Matrice d’arbitrage | Consommer scores API ; `governance_cycles.arbitrate` ; labels métier ; **pas de calcul React** | ✅ |
| 6 | §4.5, §6 | Ajout d’items | Combobox nom/code ; pas de scoring côté React | ✅ |
| 7 | §4.4 | Onglets secondaires V1 | Projets, budget, risques, décisions (lecture) | ✅ |
| 8 | §6 | Tests frontend | Hooks + composants ; pas d’ID brut en snapshots | ✅ |

**Durée indicative** : 1,5–2 sprints frontend après backend §4.3–4.5.

---

### 4.3 RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles

**Fichier** : [RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md)

**Prérequis** : **RFC-PROJ-CYCLE-001** (au minimum items listables) ; **RFC-FE-PROJ-CYCLE-001** optionnel pour le bloc UI mais recommandé après liste cycles.

| Contenu | Critères d’acceptation | État |
| ------- | ---------------------- | ---- |
| `GET /api/governance-cycles/by-project/:projectId` (module **governance-cycles** uniquement) | Read-only ; isolation client | ✅ |
| Bloc « Présence dans les cycles » sur fiche projet | Max 5 lignes + lien ; masqué sans permission | ✅ |

**Durée indicative** : 0,5 sprint.

---

### 4.6 RFC-PROJ-CYCLE-003 — Governance Cycle Instances and Configurable Propagation

**Fichier** : [RFC-PROJ-CYCLE-003 — Governance Cycle Instances and Configurable Propagation](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md)

**Prérequis** : **RFC-PROJ-CYCLE-001** à **002** livrés.

**Cas de référence** : cycle « Trimestre — Projets + Budget » → instances T1…T4 → décision à la date → propagation configurable vers fiche projet / budget.

| Lot | Section RFC | Contenu | Critères d’acceptation (résumé) | État |
| --- | ----------- | ------- | -------------------------------- | ---- |
| **003-A** | §4.4–4.6 | Prisma + CRUD instances + agenda + `open` / `archive` | `DRAFT`…`ARCHIVED` ; pas de logique clôture en A | ✅ |
| **003-B** | §4.5–4.6, §6 | `PATCH decisions` + `close` (étapes 1–6) | `InstanceDecision` = historique ; `item.decisionStatus` = dernier état ; sans propagation fiche | ✅ |
| **003-C** | §4.11.1 | `governance_cycles.propose` + `POST …/candidacies` + bouton fiche | Item `CANDIDATE` ; pas de propagation ni `InstanceDecision` à la candidature | ✅ |
| **003-D** | §4.2, §4.8, §4.13 | `governanceConfig` + readiness + propagation `WRITE_ARBITRATION_CODIR` | Clôture atomique ; échec propagation → instance `OPEN`, **409** | ✅ |
| **003-E** | §4.4, §6 | `BudgetGovernanceDecision` + propagation budget | Pas de `Budget.status` ; migration dédiée | ✅ |
| **003-F** | §4.5, §4.9 | `POST …/instances/generate` + bouton « Générer le trimestre » | `instanceSchedule` sur cycle | ✅ |

**Durée indicative** : 3–4 sprints (backend + frontend), lots parallélisables après 003-A.

**Frontend** : décrit dans RFC-003 §4.7 (onglet Instances, dialogs) — peut être suivi d’un fichier **RFC-FE-PROJ-CYCLE-002** dédié si le découpage doc le nécessite.

---

### 4.4 Documentation transverse (hors RFC numérotée cycle)

Après livraison d’une RFC : `docs/API.md`, `/starium-docs-update`, `_RFC Liste.md` (statuts), [ARCHITECTURE.md](../ARCHITECTURE.md) si nouvelles routes.

---

### 4.5 Extensions post-003 (hors RFC-003 MVP)

À traiter après **RFC-PROJ-CYCLE-003** ou en évolution ultérieure :

- Items `STRATEGIC_OBJECTIVE`, `RISK`, `BUDGET_LINE` (extension types dans `allowedSourceTypes`)
- Vote électoral complet (quorum, bulletins, anonymat) — au-delà du mode `VOTE` simplifié
- Export CODIR / PDF par instance
- Lien documents GED cycle / instance
- ACL ressource sur cycles (RFC-ACL)
- Admin studio : bibliothèque de modèles de cycles (templates client)
- Sync calendrier (Outlook / Google) pour `scheduledDecisionAt`

---

## 5. Ordre de travail suggéré (par RFC)

| Étape | RFC | Résultat utilisateur |
| ----- | --- | -------------------- |
| 1 | **RFC-PROJ-CYCLE-001** §4.1–4.2 | Données + permissions en base |
| 2 | **RFC-PROJ-CYCLE-001** §4.3–4.4 cycles | API cycles testable |
| 3 | **RFC-PROJ-CYCLE-001** §4.5 scoring | ✅ livré (B6) |
| 3b | **RFC-PROJ-CYCLE-001** §4.3 route summary + §6 | `GET …/:id/summary` (B7) — KPI global CODIR | ✅ |
| 4 | **RFC-FE-PROJ-CYCLE-001** §4.1–4.3 | Menu + liste des cycles | ✅ livré (2026-05-30) |
| 5 | **RFC-FE-PROJ-CYCLE-001** §4.4–4.5 + §6 | Arbitrage CODIR utilisable (matrice scores API) | ✅ livré (2026-05-30) |
| 6 | **RFC-PROJ-CYCLE-002** + doc | Fiche projet informée | ✅ |
| 7 | **RFC-PROJ-CYCLE-003** lots A–C | Instances, agenda, décisions, candidature fiche | ✅ |
| 8 | **RFC-PROJ-CYCLE-003** lot **003-D** | Config + readiness + propagation projet | ✅ |
| 9 | **RFC-PROJ-CYCLE-003** lot **003-E** | `BudgetGovernanceDecision` + propagation budget | ✅ |
| 10 | **RFC-PROJ-CYCLE-003** lot **003-F** | Génération trimestres (`instanceSchedule`) | ✅ |

---

## 6. Hors scope

### V1 livré (ne pas casser sans migration)

- Endpoint `/api/projects/:id/governance-cycles` (couplage inverse)  
- Gantt / tâches au niveau cycle  
- Duplication des tâches projet dans un cycle  

### RFC-003 MVP (ne pas inclure dans les premiers lots)

- Moteur BPM / workflow graphique configurable  
- IA sur le scoring ou les recommandations  
- **`WRITE_PROJECT_STATUS`** — **ne pas implémenter** (RFC ultérieure ; rejet config **400** si présent)  
- Table **`BudgetGovernanceDecision`** hors PR **003-A / 003-B / 003-C / 003-D** (lot **003-E** — migration `20260601130000_budget_governance_decision`)  
- Export PDF / slides intégrés  
- Vote électoral juridique complet (au-delà du mode `VOTE` simplifié)  

### Règles V1 maintenues jusqu’à migration 003

- Cycles sans instances : comportement matrice actuel inchangé  
- Propagation : **`NONE` par défaut** à l’activation de `governanceConfig`  

### Garde-fous implémentation RFC-003 (rappel)

Voir RFC-003 **§8.1** (maintenu en prod) : (1) pas de **`WRITE_PROJECT_STATUS`** ; (2) clôture **tout ou rien**, pas de propagation partielle silencieuse ; (3) **`item.decisionStatus`** = dernier état connu — historique = **`GovernanceCycleInstanceDecision`**.

---

## 7. Checklist Definition of Done (module complet)

- [x] Code compile (API) ; migration SQL présente — [ ] migration appliquée sur chaque environnement  
- [x] **RFC-PROJ-CYCLE-001** §4.3–4.4 cycles — tests CRUD cycles  
- [x] **RFC-PROJ-CYCLE-001** §4.3–4.4 items — tests CRUD items
- [x] **RFC-PROJ-CYCLE-001** §4.5 scoring + §6 tests scoring  
- [x] **RFC-PROJ-CYCLE-001** §4.3 route summary B7 + tests KPI global  
- [x] **RFC-PROJ-CYCLE-001** §6 audits validated/closed + tests B8–B9 (92 tests module après RFC-003)  
- [x] **RFC-FE-PROJ-CYCLE-001** livrée + tests frontend  
- [x] **RFC-PROJ-CYCLE-002** livrée  
- [x] Seed : module + permissions + profils globaux cohérents  
- [x] `docs/API.md` à jour (§5.8 cycles + items + scoring + summary B7 + `by-project` B9 + transitions TO_ARBITRATE/CLOSED)  
- [x] `_RFC Liste.md` aligné (31a-1 B1–B9 ; 31a-2 FE-001 ; 31a-3 RFC-002)  
- [x] RFC-PROJ-CYCLE-001 statut « Implémenté » (B9 by-project) ; **RFC-PROJ-CYCLE-002** livrée  
- [x] Revue conformité multi-client sur CRUD cycles, items et `by-project` ([ARCHITECTURE.md](../ARCHITECTURE.md))  
- [x] **RFC-PROJ-CYCLE-003** — migrations instances + budget ; API instances/candidacies/close ; **92** tests module  
- [x] `docs/API.md` §5.8 étendu (instances, candidacies, config, propagation)  
- [x] `_RFC Liste.md` — 31a-4 RFC-003 ✅ Implémenté  
- [x] UI : onglet Séances, panneau décisions/clôture, candidature fiche ; config cycle via `PATCH` API (pas de panneau admin config dédié en FE)  

---

## 8. Prompts Cursor (par RFC)

Copier-coller en Agent / Composer — **ne pas citer les lots B/F/I**.

### RFC-PROJ-CYCLE-001 (backend — route summary B7)

> **Livré (2026-05-30)** — ne plus réimplémenter. Référence : `getCycleSummary` dans `GovernanceCyclesService`, route `GET /api/governance-cycles/:id/summary`, DTO `GovernanceCycleGlobalSummaryDto`, [API.md](../API.md) §5.8.

### RFC-PROJ-CYCLE-001 (sections historiques — déjà livrées)

> CRUD items (§4.3–4.4) et scoring §4.5 (B6) : **ne plus réimplémenter**.

### RFC-FE-PROJ-CYCLE-001 (frontend)

> **Livré (2026-05-30)** — ne plus réimplémenter. Référence : `apps/web/src/features/governance-cycles/`, routes `/cycles`, tests Vitest sous `src/features/governance-cycles/**/*.spec.ts`.

### RFC-PROJ-CYCLE-002 (intégration projet)

> **Livré (2026-05-30)** — ne plus réimplémenter. Référence : `listCyclesByProject` dans `GovernanceCyclesService`, route `GET /api/governance-cycles/by-project/:projectId` (déclarée **avant** `:id`), bloc `ProjectGovernanceCyclesPresenceBlock` sur `/projects/[id]`, [API.md](../API.md) §5.8.

### RFC-PROJ-CYCLE-003 (instances + propagation)

> **Livré** (2026-06-01) : lots **003-A → 003-F** selon [RFC-PROJ-CYCLE-003](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md). Hors scope : **003-G**, `WRITE_PROJECT_STATUS`. Garde-fous prod : RFC §8.1.

### Doc après livraison

```
/starium-docs-update — synchronise RFC-PROJ-CYCLE-001 à 003, RFC-FE-PROJ-CYCLE-001, ce plan et _RFC Liste avec l’état code.
```

---

## 9. Annexe — correspondance lots historiques (optionnel)

> Les codes B/F/I ne sont plus la référence de travail. Utiliser les **§ RFC** ci-dessus.

| Lot | RFC | Section |
| --- | --- | ------- |
| B1 | RFC-PROJ-CYCLE-001 | §4.1, §5 |
| B2 | RFC-PROJ-CYCLE-001 | §3 |
| B3 | RFC-PROJ-CYCLE-001 | §4.2 |
| B4 | RFC-PROJ-CYCLE-001 | §4.3–4.4 (cycles) + summary embarqué |
| B5 | RFC-PROJ-CYCLE-001 | §4.3–4.4 (items) |
| B6 | RFC-PROJ-CYCLE-001 | §4.5 |
| B7 | RFC-PROJ-CYCLE-001 | §4.3 (route `GET …/:id/summary` — pas le summary embarqué) |
| B8–B9 | RFC-PROJ-CYCLE-001 | §6 |
| F1–F8 | RFC-FE-PROJ-CYCLE-001 | §4.1–4.5, §6 |
| I1 | RFC-PROJ-CYCLE-002 | — |
| I2 | — | doc / skill docs |
| 003-A–F | RFC-PROJ-CYCLE-003 | §4.2–4.13 (instances, config, propagation, generate) |

---

## 10. Liens

- Index RFC : [_RFC Liste.md](./_RFC%20Liste.md) — Phase 1A+  
- **RFC-PROJ-CYCLE-001** : [Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md)  
- **RFC-FE-PROJ-CYCLE-001** : [Governance Cycles Frontend UI](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md)  
- **RFC-PROJ-CYCLE-002** : [Project Integration](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md)  
- **RFC-PROJ-CYCLE-003** : [Instances and Configurable Propagation](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md) — §4.9 flux Instance CODIR vs décision Projet  
- Cadrage projets : [RFC-PROJ-001](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md)  
- Profils rôles : [default-profiles.md](../default-profiles.md)  
