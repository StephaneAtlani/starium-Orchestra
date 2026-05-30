# Plan de développement — Cycles de pilotage

> **Dernière révision** : 2026-05-29  
> **Statut global** : **partiel** — backend lots **B1 + B2 + B4** livrés ; B5–B9, frontend F1–F8 et intégration I1 **à faire**  
> **Principe produit** : **Projet = exécuter** · **Cycle = arbitrer**

Ce document est le **plan d’exécution** consolidé. Les spécifications détaillées restent dans les RFC numérotées ; ce plan les ordonne, vérifie la cohérence avec le repo et fixe les critères d’acceptation par lot.

---

## 1. Audit de la documentation (2026-05-19)

### 1.1 Documents de référence

| Document | Rôle | Cohérence |
| -------- | ---- | --------- |
| [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) | Backend : modèles, API, RBAC, scoring, tests | 🟡 Partielle (B1–B4 livrés) — [statut RFC](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) |
| [RFC-FE-PROJ-CYCLE-001](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) | UI `/cycles`, matrice, navigation | ✅ Aligné feature-first + règle « valeur métier, pas ID » |
| [RFC-PROJ-CYCLE-002](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) | `by-project` + bloc fiche projet read-only | ✅ Découplage module `governance-cycles` / `projects` |
| [_Plan de développement - Cycle projets (legacy)](./_%20Plan%20de%20d%C3%A9veloppement%20-%20%20Cycle%20projets.md) | Brouillon détaillé (lots + prompt Cursor) | ⚠️ **Doublon** — contenu repris ici ; fichier legacy conservé avec renvoi |
| [_RFC Liste](./_RFC%20Liste.md) § Phase 1A+ | Index statut RFC 31a-1 → 31a-3 | ✅ À jour (Draft) |

### 1.2 Écarts doc ↔ code (vérification repo — 2026-05-29)

| Attendu (RFC / plan) | État réel dans le repo |
| -------------------- | ---------------------- |
| Modèles `GovernanceCycle` / `GovernanceCycleItem` | ✅ `apps/api/prisma/schema.prisma` |
| Migration SQL `governance_cycles_core` | ✅ `apps/api/prisma/migrations/20260528120000_governance_cycles_core/` — appliquer via `prisma migrate deploy` (supprimer le dossier vide `20260520120000_governance_cycles_core` s’il bloque P3015) |
| Module `apps/api/src/modules/governance-cycles/` | ✅ Présent (controller, service, DTOs cycles + squelette items) |
| Routes CRUD cycles `/api/governance-cycles` (+ `:id`) | ✅ 5 endpoints — [API.md](../API.md) §5.8 |
| Routes items `/api/governance-cycles/:cycleId/items` | ❌ Lot B5 |
| `GET /api/governance-cycles/:id/summary` global | ❌ Lot B7 (`summary` par cycle déjà sur liste/détail) |
| Scoring `priorityScore` | ❌ Lot B6 |
| `GET /api/governance-cycles/by-project/:projectId` | ❌ Lot I1 / RFC-002 |
| Module RBAC `governance_cycles` + permissions seed | ✅ `seed.ts`, `default-profiles.json` |
| Pages `/cycles`, feature `governance-cycles` | ❌ Absentes de `apps/web` |
| Entrée sidebar « Cycles de pilotage » | ❌ Absente de `navigation.ts` |

### 1.3 Corrections documentaires à retenir pour l’implémentation

- **Risques** : l’entité métier projet est `ProjectRisk` (pas un modèle `Risk` global) — les FK `riskId` sur `GovernanceCycleItem` doivent pointer vers `ProjectRisk` avec contrôle `project.clientId = client actif`.
- **Endpoint projet** : exposer `GET /api/governance-cycles/by-project/:projectId` côté **governance-cycles** uniquement (RFC-002), pas sous `/api/projects/...`.
- **Décision d’arbitrage** : portée par `GovernanceCycleItem.decisionStatus` — **ne jamais** synchroniser vers `Project.status` en V1.
- **Profils globaux** : ajouter au minimum `governance_cycles.read` aux rôles « Directeur », « Chef de projet », profils Strategic Board selon politique produit ; créer un profil dédié « Gestionnaire cycles de pilotage » si besoin CODIR.

### 1.4 Fonctionnalités existantes (proxies, hors scope cycle)

Tant que l’UI cycles n’est pas livrée (F1–F8), ces écrans couvrent une partie du besoin **sans** objet « cycle » côté front :

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

**Types d’items V1** (priorité d’implémentation) :

1. `PROJECT` — MVP indispensable  
2. `MANUAL` — éléments hors référentiel  
3. `BUDGET` — lien budget / enveloppe  
4. `STRATEGIC_OBJECTIVE`, `BUDGET_LINE`, `RISK` — extension lot 2 si charge OK  

---

## 3. Architecture technique (rappel)

- **API** : REST sous `/api/governance-cycles`, préfixe global Nest existant.
- **Multi-client** : `clientId` dérivé du client actif ; jamais dans les DTO write ; filtrage systématique.
- **Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.
- **Frontend** : `apps/web/src/features/governance-cycles/` + routes App Router ; TanStack Query avec `clientId` dans les query keys.
- **Audit** : événements listés en RFC-001 (RFC-013).
- **Références** : [ARCHITECTURE.md](../ARCHITECTURE.md), [RFC-011](./RFC-011-roles-permissions-modules.md), [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md).

---

## 4. Plan d’exécution par lots

Ordre recommandé : **backend d’abord** (lots B1–B10), puis **frontend** (F1–F10), puis **intégration projet** (I1). Ne pas commencer l’UI avant B4 + B5 stables.

### Phase A — Backend socle

| Lot | Contenu | Livrables | Critères d’acceptation | RFC | État |
| --- | ------- | --------- | ---------------------- | --- | ---- |
| **B1** | Prisma | Migration `GovernanceCycle`, `GovernanceCycleItem`, 4 enums, index `clientId` | `pnpm prisma migrate` OK ; contraintes FK + `@@unique([cycleId, projectId])` où applicable | 001 §4.1, 5 | ✅ |
| **B2** | Module Nest squelette | `governance-cycles.module.ts`, enregistrement `app.module.ts` | Module boot ; DTOs cycles + squelette items | 001 §3 | ✅ |
| **B3** | RBAC + seed | `ensureGovernanceCyclesModuleAndPermissions()` ; module client activable ; profils `default-profiles.json` | Permissions créées ; au moins un rôle global avec `governance_cycles.read` en démo | 001 §4.2 | ✅ |
| **B4** | CRUD cycles | 5 endpoints cycle ; archive logique sur DELETE | 404 hors client ; 409 si cycle `ARCHIVED` modifié ; pas de `clientId` en body ; liste `{ items, total, limit, offset }` + `summary` | 001 §4.3–4.4 | ✅ |
| **B5** | CRUD items | 5 endpoints items ; validation `sourceType` + FK | Doublon projet → 409 ; ref hors client → 404 ; pas de mutation `Project` | 001 §4.3–4.4 | |
| **B6** | Scoring | Formule `priorityScore` dans le service | Recalcul à chaque save item ; scores 1–5 ; `null` si incomplet | 001 §4.5 | |
| **B7** | Summary | `GET .../:id/summary` | Agrégats cohérents avec `decisionStatus` ; pas de N+1 grossier | 001 §4.3 | |
| **B8** | Audit | Hooks audit sur cycle / item / décision | Événements émis avec `clientId` et acteur | 001 §6 | partiel (cycle) |
| **B9** | Tests backend | Specs service + controller (isolation client, permissions, scoring) | `pnpm test` vert sur le module | 001 §6 | partiel |

**Durée indicative** : 1,5–2 sprints backend (équipe familière du repo).

### Phase B — Frontend MVP

| Lot | Contenu | Livrables | Critères d’acceptation | RFC |
| --- | ------- | --------- | ---------------------- | --- |
| **F1** | Feature skeleton | `features/governance-cycles/` (api, hooks, keys, types, schemas) | Query keys incluent `clientId` | FE-001 §4.2 |
| **F2** | Navigation | Section **Gouvernance** (ou **Pilotage stratégique**) → « Cycles de pilotage » → `/cycles` | Masqué si module off ou sans `governance_cycles.read` | FE-001 §4.1 |
| **F3** | Liste `/cycles` | KPI, filtres, table paginée, dialog création | Libellés FR ; pas d’UUID en colonnes | FE-001 §4.3 |
| **F4** | Détail `/cycles/[id]` | Header, onglets (overview + matrice minimum) | États loading / empty / error | FE-001 §4.4 |
| **F5** | Matrice d’arbitrage | Table + actions décision (`governance_cycles.arbitrate`) | Retenir / Différer / Refuser / etc. ; labels métier | FE-001 §4.5 |
| **F6** | Ajout d’items | Dialog recherche projet / manuel / budget | Combobox par nom/code ; soumission par ID interne uniquement | FE-001 §4.5, 6 |
| **F7** | Onglets secondaires V1 | Projets candidats, Budget & capacité, Risques, Décisions (lecture) ; Documents = placeholder | Données issues API ; pas de logique scoring côté React | FE-001 §4.4 |
| **F8** | Tests frontend | Tests hooks + composants critiques (permissions, labels) | Pas d’ID brut dans snapshots UI | FE-001 §6 |

**Durée indicative** : 1,5–2 sprints frontend après B7.

### Phase C — Intégration transverse

| Lot | Contenu | Livrables | Critères d’acceptation | RFC |
| --- | ------- | --------- | ---------------------- | --- |
| **I1** | Fiche projet | `GET by-project` + bloc « Présence dans les cycles » | Read-only ; max 5 lignes + lien ; masqué sans permission | 002 |
| **I2** | Doc API | `docs/API.md` + passage RFC 001/002/FE en « Implémenté » si livré | Endpoints documentés avec permissions | skill docs |

**Durée indicative** : 0,5 sprint.

### Phase D — Extension (post-MVP, hors V1 stricte)

| Lot | Contenu | Note |
| --- | ------- | ---- |
| **E1** | Items `STRATEGIC_OBJECTIVE`, `RISK`, `BUDGET_LINE` | Après stabilisation PROJECT + BUDGET |
| **E2** | Transitions de statut cycle (PREPARING → TO_ARBITRATE → ARBITRATED → IN_EXECUTION → CLOSED) | Actions explicites + règles RFC (cycle vide, items CANDIDATE) |
| **E3** | Export CODIR / PDF | Hors scope V1 |
| **E4** | Lien documents GED cycle | Placeholder UI → module documents |
| **E5** | ACL ressource (RFC-ACL) sur cycles | Si politique RESTRICTIVE requise |

---

## 5. Mapping sprints (suggestion)

| Sprint | Lots | Résultat utilisateur |
| ------ | ---- | -------------------- |
| **S1** | B1–B3 | Données + permissions en base |
| **S2** | B4–B7, B9 | API testable (Postman / tests) |
| **S3** | F1–F3 | Menu + liste des cycles |
| **S4** | F4–F7 | Arbitrage CODIR utilisable |
| **S5** | I1, B8, F8, I2 | Fiche projet informée + durcissement |

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
- [x] Tests backend CRUD cycles (`governance-cycles.*.spec.ts`) — [ ] tests scoring + items + isolation étendue  
- [ ] Tests frontend query keys + affichage sans ID brut  
- [x] Seed : module + permissions + profils globaux cohérents  
- [x] `docs/API.md` à jour (§5.8)  
- [ ] RFC 001 **complète** / FE-001 / 002 statut « Implémenté » + `_RFC Liste.md` (001 = partielle aujourd’hui)  
- [x] Revue conformité multi-client sur lots B1–B4 ([ARCHITECTURE.md](../ARCHITECTURE.md) §4)  

---

## 8. Prompt d’implémentation (résumé)

Pour lancer un lot en Agent / Composer, référencer :

1. Ce plan (numéro de lot, ex. **B4**)  
2. La RFC correspondante  
3. Fichiers voisins à imiter : `apps/api/src/modules/strategic-vision/` (Nest), `apps/web/src/features/strategic-vision/` (UI)  
4. Contraintes : pas de `clientId` en DTO ; scoring backend uniquement ; labels FR  

Le prompt détaillé historique reste dans le [fichier legacy](./_%20Plan%20de%20d%C3%A9veloppement%20-%20%20Cycle%20projets.md) §5.

---

## 9. Liens

- Index RFC : [_RFC Liste.md](./_RFC%20Liste.md) — Phase 1A+  
- Cadrage projets : [RFC-PROJ-001](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md)  
- Profils rôles : [default-profiles.md](../default-profiles.md)  
