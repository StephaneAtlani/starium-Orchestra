# Plan de développement — Cycles de pilotage

> **Dernière révision** : 2026-05-30  
> **Statut global** : **partiel** — [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) backend **B1–B8** livrés (CRUD, scoring, KPI, audits validated/closed) ; [RFC-FE-PROJ-CYCLE-001](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) et [RFC-PROJ-CYCLE-002](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) (**B9** `by-project`) **à faire**  
> **Principe produit** : **Projet = exécuter** · **Cycle = arbitrer**

Ce document est le **plan d’exécution** consolidé. **Tu travailles par numéro de RFC** (fichiers dans `docs/RFC/`) ; les anciens codes « lots » (B1, F3, I1…) restent en **annexe** pour lecture historique uniquement.

---

## 1. Audit de la documentation (2026-05-19)

### 1.1 Documents de référence (RFC)

| RFC | Fichier | Rôle | État |
| --- | ------- | ---- | ---- |
| **RFC-PROJ-CYCLE-001** | [Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) | Backend : Prisma, module Nest, RBAC, API cycles/items, scoring, summary, audits, tests | 🟡 Partielle (B1–B8 livrés ; reste B9 by-project) |
| **RFC-FE-PROJ-CYCLE-001** | [Governance Cycles Frontend UI](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) | UI `/cycles`, matrice, navigation | 📝 Draft — non implémentée |
| **RFC-PROJ-CYCLE-002** | [Project Integration for Governance Cycles](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) | `by-project` + bloc fiche projet read-only | 📝 Draft — non implémentée |
| [_RFC Liste](./_RFC%20Liste.md) § Phase 1A+ | Index 31a-1 → 31a-3 | Statuts index | À jour |
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
| **RFC-PROJ-CYCLE-001** §6 — audits items + tests backend complets | ✅ (audits cycle validated/closed, règles TO_ARBITRATE/CLOSED, tests B8 — 78 tests module ; hors B9 by-project) |
| **RFC-FE-PROJ-CYCLE-001** — UI `/cycles` | ❌ |
| **RFC-PROJ-CYCLE-002** — `GET …/by-project/:projectId` + bloc projet | ❌ |

> **Lexique `summary` (ne pas confondre)**  
> - **Embarqué ✅ (B4)** : objet `summary` inclus dans la réponse cycle (liste et détail). Suffit pour la liste `/cycles` et le header détail.  
> - **Route dédiée ✅ (B7)** : `GET /api/governance-cycles/:id/summary` — ressource KPI autonome (`GovernanceCycleGlobalSummaryDto`, contrat distinct du `summary` embarqué). Recommandée pour l’onglet KPI overview FE.

### 1.3 Corrections documentaires à retenir pour l’implémentation

- **Risques** : l’entité métier projet est `ProjectRisk` (pas un modèle `Risk` global) — les FK `riskId` sur `GovernanceCycleItem` doivent pointer vers `ProjectRisk` avec contrôle `project.clientId = client actif.
- **Endpoint projet** : exposer `GET /api/governance-cycles/by-project/:projectId` côté **governance-cycles** uniquement (**RFC-PROJ-CYCLE-002**), pas sous `/api/projects/...`.
- **Décision d’arbitrage** : portée par `GovernanceCycleItem.decisionStatus` — **ne jamais** synchroniser vers `Project.status` en V1.
- **Profils globaux** : ajouter au minimum `governance_cycles.read` aux rôles « Directeur », « Chef de projet », profils Strategic Board selon politique produit ; créer un profil dédié « Gestionnaire cycles de pilotage » si besoin CODIR.

### 1.4 Fonctionnalités existantes (proxies, hors scope cycle)

Tant que **RFC-FE-PROJ-CYCLE-001** n’est pas livrée, ces écrans couvrent une partie du besoin **sans** objet « cycle » côté front :

| Besoin schéma produit | Écran actuel | Limite |
| --------------------- | ------------ | ------ |
| Présentation CODIR (1 projet) | `/projects/committee/codir` | Pas de matrice multi-candidats ni retenu/différé structuré |
| Synthèse décisionnelle | `/projects/[id]/sheet` | Pas de rattachement à une cadence / période |
| Comparaison scénarios | `/projects/[id]/scenarios/cockpit` | Arbitrage scénario, pas portefeuille |
| Vision / budget / risques | Modules dédiés | Pas de couche transverse d’arbitrage |

Référence manuel : `docs/MANUEL-40-PROJETS-RISQUES-ACTIONS.md` §7.4 (CODIR).

---

## 2. Position produit (cible)

Couche **transverse de gouvernance** entre les entrées stratégiques / financières et l’exécution projet :

```text
Entrées          →  Cycle de pilotage           →  Exécution (module Projets)
─────────────────────────────────────────────────────────────────────────────
Vision, objectifs     Arbitrer, prioriser            Tâches, jalons, Gantt
Budget, capacité      Retenir / différer             Risques projet, budget projet
Risques               Préparer CODIR                 Scénarios, revues, documents
                      Vérifier faisabilité
                      Suivre le cycle de décision
```

**Cadences V1** (enum `GovernanceCycleCadence`) : mensuel, trimestriel, semestriel, annuel, ponctuel, continu, personnalisé — libellés FR en UI, jamais les enums bruts.

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

**Ordre recommandé** : finir **RFC-PROJ-CYCLE-001** (backend) → **RFC-FE-PROJ-CYCLE-001** (UI) → **RFC-PROJ-CYCLE-002** (fiche projet). Ne pas commencer **RFC-FE-PROJ-CYCLE-001** avant CRUD cycles **et** items stables (**RFC-PROJ-CYCLE-001** §4.3–4.4).

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
| 8 | §6 | Audits items + tests backend complets | `governance_cycle_item.*` ✅ ; audits `validated`/`closed` + règles transitions ✅ ; tests B8 (78 tests module) ; reste B9 by-project (RFC-002) | ✅ |

**Durée indicative** : 1,5–2 sprints backend (équipe familière du repo).

---

### 4.2 RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI

**Fichier** : [RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md)

**Prérequis** : **RFC-PROJ-CYCLE-001** §4.3–4.5 + **B7 KPI global** — **livré**.

**Calquer** : `apps/web/src/features/strategic-vision/`, [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md).

| Ordre | Section RFC | Contenu | Critères d’acceptation (résumé) | État |
| ----- | ----------- | ------- | -------------------------------- | ---- |
| 1 | §4.2 | Feature skeleton `features/governance-cycles/` | api, hooks, query keys avec `clientId` | ❌ |
| 2 | §4.1 | Navigation → `/cycles` | Masqué si module off ou sans `governance_cycles.read` | ❌ |
| 3 | §4.3 | Liste `/cycles` | Filtres, pagination, création ; libellés FR, pas d’UUID en colonnes | ❌ |
| 4 | §4.4 | Détail `/cycles/[id]` | Header, onglets (overview + matrice minimum) | ❌ |
| 5 | §4.5 | Matrice d’arbitrage | Consommer scores API ; `governance_cycles.arbitrate` ; labels métier ; **pas de calcul React** | ❌ |
| 6 | §4.5, §6 | Ajout d’items | Combobox nom/code ; pas de scoring côté React | ❌ |
| 7 | §4.4 | Onglets secondaires V1 | Projets, budget, risques, décisions (lecture) | ❌ |
| 8 | §6 | Tests frontend | Hooks + composants ; pas d’ID brut en snapshots | ❌ |

**Durée indicative** : 1,5–2 sprints frontend après backend §4.3–4.5.

---

### 4.3 RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles

**Fichier** : [RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md)

**Prérequis** : **RFC-PROJ-CYCLE-001** (au minimum items listables) ; **RFC-FE-PROJ-CYCLE-001** optionnel pour le bloc UI mais recommandé après liste cycles.

| Contenu | Critères d’acceptation | État |
| ------- | ---------------------- | ---- |
| `GET /api/governance-cycles/by-project/:projectId` (module **governance-cycles** uniquement) | Read-only ; isolation client | ❌ |
| Bloc « Présence dans les cycles » sur fiche projet | Max 5 lignes + lien ; masqué sans permission | ❌ |

**Durée indicative** : 0,5 sprint.

---

### 4.4 Documentation transverse (hors RFC numérotée cycle)

Après livraison d’une RFC : `docs/API.md`, `/starium-docs-update`, `_RFC Liste.md` (statuts), [ARCHITECTURE.md](../ARCHITECTURE.md) si nouvelles routes.

---

### 4.5 Extensions post-MVP (pas de RFC dédiée aujourd’hui)

À traiter dans une future RFC ou évolution **RFC-PROJ-CYCLE-001** / **FE-001** :

- Items `STRATEGIC_OBJECTIVE`, `RISK`, `BUDGET_LINE` (après PROJECT + BUDGET)
- Transitions de statut cycle (PREPARING → … → CLOSED)
- Export CODIR / PDF
- Lien documents GED cycle
- ACL ressource sur cycles (RFC-ACL)

---

## 5. Ordre de travail suggéré (par RFC)

| Étape | RFC | Résultat utilisateur |
| ----- | --- | -------------------- |
| 1 | **RFC-PROJ-CYCLE-001** §4.1–4.2 | Données + permissions en base |
| 2 | **RFC-PROJ-CYCLE-001** §4.3–4.4 cycles | API cycles testable |
| 3 | **RFC-PROJ-CYCLE-001** §4.5 scoring | ✅ livré (B6) |
| 3b | **RFC-PROJ-CYCLE-001** §4.3 route summary + §6 | `GET …/:id/summary` (B7) — KPI global CODIR | ✅ |
| 4 | **RFC-FE-PROJ-CYCLE-001** §4.1–4.3 | Menu + liste des cycles — **débloqué** (backend B1–B8) |
| 5 | **RFC-FE-PROJ-CYCLE-001** §4.4–4.5 + §6 | Arbitrage CODIR utilisable (matrice scores API) |
| 6 | **RFC-PROJ-CYCLE-002** + doc | Fiche projet informée |

---

## 6. Hors scope V1 (ne pas implémenter)

- Modification automatique de `Project.status` selon décision cycle  
- Gantt / tâches au niveau cycle  
- Moteur BPM / workflow configurable  
- IA sur le scoring ou les recommandations  
- Export PDF / slides intégrés  
- Duplication des tâches projet dans un cycle  
- Endpoint `/api/projects/:id/governance-cycles` (couplage inverse)  

---

## 7. Checklist Definition of Done (module complet)

- [x] Code compile (API) ; migration SQL présente — [ ] migration appliquée sur chaque environnement  
- [x] **RFC-PROJ-CYCLE-001** §4.3–4.4 cycles — tests CRUD cycles  
- [x] **RFC-PROJ-CYCLE-001** §4.3–4.4 items — tests CRUD items
- [x] **RFC-PROJ-CYCLE-001** §4.5 scoring + §6 tests scoring  
- [x] **RFC-PROJ-CYCLE-001** §4.3 route summary B7 + tests KPI global  
- [x] **RFC-PROJ-CYCLE-001** §6 audits validated/closed + tests B8 (78 tests module)  
- [ ] **RFC-FE-PROJ-CYCLE-001** livrée + tests frontend  
- [ ] **RFC-PROJ-CYCLE-002** livrée  
- [x] Seed : module + permissions + profils globaux cohérents  
- [x] `docs/API.md` à jour (§5.8 cycles + items + scoring + summary B7 + transitions TO_ARBITRATE/CLOSED)  
- [x] `_RFC Liste.md` aligné (31a-1 partiel B1–B8)  
- [ ] RFC 001 statut « Implémenté » (après B9 by-project) ; FE-001 / 002 à faire  
- [x] Revue conformité multi-client sur CRUD cycles et items ([ARCHITECTURE.md](../ARCHITECTURE.md) — B1–B8)  

---

## 8. Prompts Cursor (par RFC)

Copier-coller en Agent / Composer — **ne pas citer les lots B/F/I**.

### RFC-PROJ-CYCLE-001 (backend — route summary B7)

> **Livré (2026-05-30)** — ne plus réimplémenter. Référence : `getCycleSummary` dans `GovernanceCyclesService`, route `GET /api/governance-cycles/:id/summary`, DTO `GovernanceCycleGlobalSummaryDto`, [API.md](../API.md) §5.8.

### RFC-PROJ-CYCLE-001 (sections historiques — déjà livrées)

> CRUD items (§4.3–4.4) et scoring §4.5 (B6) : **ne plus réimplémenter**.

### RFC-FE-PROJ-CYCLE-001 (frontend)

```
Implémente RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI (docs/RFC/RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI.md).

Calque apps/web/src/features/strategic-vision/. Query keys avec clientId. Libellés FR, jamais UUID en UI. docs/FRONTEND_UI-UX.md.

Prérequis : API RFC-PROJ-CYCLE-001 §4.3–4.5 + B7 KPI global + B8 audits (B1–B8 livrés). Consommer `priorityScore` et `GET …/:id/summary` API — aucun calcul scoring côté React.
```

### RFC-PROJ-CYCLE-002 (intégration projet)

```
Implémente RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles (docs/RFC/RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles.md).

GET /api/governance-cycles/by-project/:projectId côté governance-cycles uniquement. Bloc read-only fiche projet. Pas de mutation Project.status.
```

### Doc après livraison

```
/starium-docs-update — synchronise RFC-PROJ-CYCLE-001, RFC-FE-PROJ-CYCLE-001, RFC-PROJ-CYCLE-002, ce plan et _RFC Liste avec l’état code.
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

---

## 10. Liens

- Index RFC : [_RFC Liste.md](./_RFC%20Liste.md) — Phase 1A+  
- **RFC-PROJ-CYCLE-001** : [Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md)  
- **RFC-FE-PROJ-CYCLE-001** : [Governance Cycles Frontend UI](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md)  
- **RFC-PROJ-CYCLE-002** : [Project Integration](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md)  
- Cadrage projets : [RFC-PROJ-001](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md)  
- Profils rôles : [default-profiles.md](../default-profiles.md)  
