# RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend

## Statut

🟡 **Partiellement implémenté** (backend) — lots **B1–B7** livrés (2026-05-30) : modèles, RBAC, CRUD cycles, CRUD items, audits items, **scoring `priorityScore`**, **KPI global `GET …/:id/summary`**. Restent **B9** (`by-project`) et frontend **FE-001**.

**Plan d’exécution** : [_Plan de développement - Cycles de pilotage.md](./_Plan%20de%20d%C3%A9veloppement%20-%20Cycles%20de%20pilotage.md) (lots B1–B9).

**Dépend de** : [RFC-PROJ-001 — Cadrage fonctionnel du module Projets](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md), [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md), [RFC-011-roles-permissions-modules](./RFC-011-roles-permissions-modules.md).

### État d’implémentation (aligné code)

| Périmètre | État | Référence code / API |
| --------- | ---- | -------------------- |
| Modèles Prisma + migration `governance_cycles_core` | ✅ | `apps/api/prisma/schema.prisma` ; migration `20260528120000_governance_cycles_core` |
| Module Nest `governance-cycles` | ✅ | `apps/api/src/modules/governance-cycles/` |
| RBAC `governance_cycles.*` + seed + profils globaux | ✅ | `apps/api/prisma/seed.ts`, `default-profiles.json` |
| CRUD cycles (5 routes) | ✅ | `GET\|POST /api/governance-cycles`, `GET\|PATCH\|DELETE /api/governance-cycles/:id` — voir [docs/API.md](../API.md) §5.8 |
| `summary` embarqué par cycle (agrégats items) | ✅ | Champ `summary` sur liste et détail (3 compteurs légers) |
| `GET …/:id/summary` KPI global (lot B7) | ✅ | `GovernanceCycleGlobalSummaryDto` — voir [API.md](../API.md) §5.8 |
| Audits cycle `created` / `updated` / `archived` | ✅ | `GovernanceCyclesService` |
| CRUD items (5 routes sous `:id/items`) | ✅ | Lot B5 — détail [API.md](../API.md) §5.8 ; PATCH édition/arbitrage séparés (body mixte → 400) |
| DTOs items | ✅ | `create-` / `update-` / `list-governance-cycle-items-query` |
| Audits items | ✅ | `governance_cycle_item.created\|updated\|deleted\|decision_changed` |
| Tests unit items (service + controller) | ✅ | `governance-cycles.service.spec.ts`, `governance-cycles.controller.spec.ts` |
| Scoring `priorityScore` (§4.5) | ✅ | `governance-cycle-scoring.util.ts` (`computePriorityScore`, `hasScorePatch`) ; recalcul create toujours, update si clé score présente ; DTOs + specs ValidationPipe ; tri `nulls: 'last'` |
| Tests scoring §6 | ✅ | `governance-cycle-scoring.util.spec.ts`, `governance-cycles.service.spec.ts`, `create-` / `update-governance-cycle-item.dto.spec.ts` |
| Tests summary KPI B7 §6 | ✅ | `getCycleSummary` — 5 cas service + controller (61 tests module) |
| `GET …/by-project` | ❌ | Lot B9, [RFC-PROJ-CYCLE-002](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md) |

---

## 1) Analyse de l’existant

- Le module `projects` porte l’exécution (planning, risques, budget links, scenarios) et ne doit pas recevoir la logique d’arbitrage CODIR.
- Les conventions Starium backend sont en place : guards standards (`JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`), DTO validés, `clientId` dérivé du contexte actif.
- Les modules stratégiques et budget ont un modèle d’isolation stricte par client et des APIs API-first client-scopées.
- La couche transverse **cycles de pilotage** expose le CRUD cycles, le CRUD items (`GovernanceCycleItem`), le **scoring `priorityScore`** (lot B6) et le **KPI global** `GET …/:id/summary` (lot B7 — `GovernanceCycleGlobalSummaryDto`, distinct du `summary` embarqué).

---

## 2) Hypotheses eventuelles

- V1 ne cree pas de moteur workflow complexe; le cycle avance via statuts et actions explicites.
- `DELETE` d’un cycle est un archivage logique (`status=ARCHIVED`), pas de suppression physique.
- Un item de cycle peut referencer plusieurs familles d’objets, mais une seule source metier principale a la fois (`sourceType` + FK coherente).
- Le calcul de `priorityScore` reste deterministic et explicable, sans IA.

---

## 3) Liste des fichiers a creer / modifier

**Creer**

- `apps/api/src/modules/governance-cycles/governance-cycles.module.ts`
- `apps/api/src/modules/governance-cycles/governance-cycles.controller.ts`
- `apps/api/src/modules/governance-cycles/governance-cycles.service.ts`
- `apps/api/src/modules/governance-cycles/dto/create-governance-cycle.dto.ts`
- `apps/api/src/modules/governance-cycles/dto/update-governance-cycle.dto.ts`
- `apps/api/src/modules/governance-cycles/dto/create-governance-cycle-item.dto.ts`
- `apps/api/src/modules/governance-cycles/dto/update-governance-cycle-item.dto.ts`
- `apps/api/src/modules/governance-cycles/dto/list-governance-cycles-query.dto.ts`
- `apps/api/src/modules/governance-cycles/dto/list-governance-cycle-items-query.dto.ts`
- migration Prisma dediee `apps/api/prisma/migrations/<timestamp>_governance_cycles_core/migration.sql`

**Modifier**

- `apps/api/prisma/schema.prisma` — ✅ modèles présents
- `apps/api/src/app.module.ts` — ✅ `GovernanceCyclesModule` importé
- `apps/api/prisma/seed.ts` — ✅ `ensureGovernanceCyclesModuleAndPermissions()`
- `apps/api/prisma/default-profiles.json` — ✅ profils lecture / gestion cycles
- `docs/API.md` — ✅ section §5.8 (cycles B4 + items B5)

---

## 4) Implementation complete

### 4.1 Modeles Prisma

Ajouter :

- `GovernanceCycle`
- `GovernanceCycleItem`
- enums:
  - `GovernanceCycleCadence`
  - `GovernanceCycleStatus`
  - `GovernanceCycleItemSourceType`
  - `GovernanceCycleItemDecisionStatus`

Contraintes minimales :

- Index `clientId` sur les deux modeles.
- FK `GovernanceCycleItem.cycleId -> GovernanceCycle.id` en `onDelete: Cascade`.
- Unicite logique recommandee pour eviter doublon projet dans un cycle: `@@unique([cycleId, projectId])` avec `projectId` nullable (ou enforcement service si SQL nullable partielle non souhaitee).

### 4.2 RBAC et activation module

Nouveau module RBAC `governance_cycles` avec permissions :

- `governance_cycles.read`
- `governance_cycles.create`
- `governance_cycles.update`
- `governance_cycles.delete`
- `governance_cycles.arbitrate`

Toutes les routes doivent rester sous pipeline guards standard Starium.

### 4.3 Endpoints V1

Cycles :

- `GET /api/governance-cycles`
- `POST /api/governance-cycles`
- `GET /api/governance-cycles/:id`
- `PATCH /api/governance-cycles/:id`
- `DELETE /api/governance-cycles/:id` (archive logique)

Items :

- `GET /api/governance-cycles/:id/items` ✅
- `POST /api/governance-cycles/:id/items` ✅
- `GET /api/governance-cycles/:id/items/:itemId` ✅
- `PATCH /api/governance-cycles/:id/items/:itemId` ✅ (voir règles PATCH ci-dessous)
- `DELETE /api/governance-cycles/:id/items/:itemId` ✅ (suppression physique, **204**)

Agregats :

- `GET /api/governance-cycles/:id/summary` ✅ — `GovernanceCycleGlobalSummaryDto` (KPI overview ; voir [API.md](../API.md) §5.8)
- `GET /api/governance-cycles/by-project/:projectId` ❌ (lot B9 — [RFC-PROJ-CYCLE-002](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md))

### 4.4 Regles metier obligatoires

- Aucun `clientId` dans les DTO write.
- Filtrage `clientId` sur toutes les lectures.
- Refus de modification sur cycle `ARCHIVED`.
- Refus de cloture d’un cycle vide.
- Refus de validation si des items sont encore `CANDIDATE`.
- Verification d’appartenance client pour toutes references (`projectId`, `budgetId`, `budgetLineId`, `riskId` → `ProjectRisk`, `strategicObjectiveId`).
- Items **MANUAL** : aucune FK dans le body create (presence d’un id source → **400**).
- **PATCH item** : un seul handler ; champs edition (`title`, `description`, `estimated*`) vs arbitrage (`decisionStatus`, `decisionReason`) — body mixte → **400** ; permissions fines `governance_cycles.update` / `governance_cycles.arbitrate` (entree handler via `RequireAnyPermissions`).
- Pas de mutation de `Project.status` ni des entites sources.
- Erreurs:
  - `404` objet inexistant ou hors client
  - `400` incoherence `sourceType` / identifiants ; body PATCH mixte ; FK sur MANUAL
  - `403` PATCH sans permission du groupe de champs
  - `409` doublon fonctionnel (ex: meme projet deja dans le cycle) ; cycle `ARCHIVED`

### 4.5 Scoring backend ✅ (lot B6 — 2026-05-30)

Formule :

```ts
priorityScore =
  (valueScore * 3) +
  (alignmentScore * 3) +
  (budgetScore * 2) +
  (capacityScore * 2) -
  (riskScore * 2);
```

Regles :

- scores optionnels;
- si presents: bornes `1..5`;
- recalcul automatique a **create** (toujours) et a **update** si le body contient une cle score (`hasScorePatch`, y compris `null`);
- `priorityScore = null` si donnees insuffisantes (un des cinq scores absent).

**Implementation** : `governance-cycle-scoring.util.ts` (`computePriorityScore`, `hasScorePatch`) ; DTOs create/update (1–5, `null` efface) ; **`priorityScore` jamais en entree** (specs ValidationPipe) ; recalcul update conditionnel via `hasOwnProperty` ; groupe edition PATCH ; tests util + service + DTO specs. Voir [API.md](../API.md) §5.8.

---

## 5) Modifications Prisma si necessaire

- Migration SQL avec creation des 2 tables + enums + index + FK.
- Option recommandee: migration additionnelle d’index sur requetes frequentes (`clientId,status`, `cycleId`, `projectId`, `riskId`).
- Ajouter auditability champs de cycle (`validatedByUserId`, `validatedAt`, `closedAt`) des la V1 pour eviter migration corrective precoce.

---

## 6) Tests

### Backend unit/integration

- creation cycle avec client actif => succes
- creation/refetch hors client => non visible
- refus sans permission/module desactive
- archivage logique via `DELETE`
- interdiction update cycle archive
- interdiction item avec reference hors client ✅ (tests service)
- interdiction doublon projet dans un meme cycle ✅
- MANUAL avec FK → 400 ✅
- PATCH mixte edition + arbitrage → 400 ✅
- permissions PATCH par groupe de champs ✅
- calcul `priorityScore` exact ✅ (lot B6 — util, service, specs DTO ValidationPipe)
- endpoint `summary` global coherent avec les statuts decision ✅ (lot B7)

### Audit

Verifier emission:

- `governance_cycle.created|updated|archived|validated|closed`
- `governance_cycle_item.created|updated|deleted|decision_changed`

---

## 7) Recapitulatif final

Cette RFC introduit un module backend `governance-cycles` strictement client-scope pour piloter l’arbitrage CODIR sans impacter le cycle de vie `Project`. Le coeur V1 couvre modeles Prisma, RBAC, CRUD cycles/items, scoring explicable, summary embarqué (listes/header), KPI global `GET …/:id/summary` et trace audit.

---

## 8) Points de vigilance

1. Ne jamais propager une decision de cycle vers `Project.status` en V1.
2. Eviter les N+1 dans `summary` et `by-project` (agregation SQL/Prisma).
3. Garantir la lisibilite metier cote API (retours enrichis par noms/codes, pas IDs seuls exploites par le front).
4. Maintenir l’isolation multi-client sur toutes les jointures d’objets references.
5. Conserver la responsabilite metier dans le service Nest, pas dans le controller.
