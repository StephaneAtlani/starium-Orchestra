# RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend

## Statut

📝 **Draft** — spécification cible pour implémentation backend V1.

**Dépend de** : [RFC-PROJ-001 — Cadrage fonctionnel du module Projets](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md), [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md), [RFC-011-roles-permissions-modules](./RFC-011-roles-permissions-modules.md).

---

## 1) Analyse de l’existant

- Le module `projects` porte l’execution (planning, risques, budget links, scenarios) et ne doit pas recevoir la logique d’arbitrage CODIR.
- Les conventions Starium backend sont deja en place : guards standards (`JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`), DTO valides, `clientId` derive du contexte actif.
- Les modules strategiques et budget ont deja un modele d’isolation stricte par client et des APIs API-first client-scopees.
- Il manque une couche transverse pour arbitrer des objets heterogenes (projet, budget, risque, objectif) sans muter leur etat source.

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

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/prisma/seed.ts`
- `apps/api/prisma/default-profiles.json`
- `docs/API.md` (apres implementation)

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

- `GET /api/governance-cycles/:cycleId/items`
- `POST /api/governance-cycles/:cycleId/items`
- `GET /api/governance-cycles/:cycleId/items/:itemId`
- `PATCH /api/governance-cycles/:cycleId/items/:itemId`
- `DELETE /api/governance-cycles/:cycleId/items/:itemId`

Agregats :

- `GET /api/governance-cycles/:id/summary`
- `GET /api/governance-cycles/by-project/:projectId`

### 4.4 Regles metier obligatoires

- Aucun `clientId` dans les DTO write.
- Filtrage `clientId` sur toutes les lectures.
- Refus de modification sur cycle `ARCHIVED`.
- Refus de cloture d’un cycle vide.
- Refus de validation si des items sont encore `CANDIDATE`.
- Verification d’appartenance client pour toutes references (`projectId`, `budgetId`, `budgetLineId`, `riskId`, `strategicObjectiveId`).
- Erreurs:
  - `404` objet inexistant ou hors client
  - `400` incoherence `sourceType` / identifiants
  - `409` doublon fonctionnel (ex: meme projet deja dans le cycle)

### 4.5 Scoring backend

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
- recalcul automatique a chaque create/update item;
- `priorityScore = null` si donnees insuffisantes.

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
- interdiction item avec reference hors client
- interdiction doublon projet dans un meme cycle
- calcul `priorityScore` exact
- endpoint `summary` coherent avec les statuts decision

### Audit

Verifier emission:

- `governance_cycle.created|updated|archived|validated|closed`
- `governance_cycle_item.created|updated|deleted|decision_changed`

---

## 7) Recapitulatif final

Cette RFC introduit un module backend `governance-cycles` strictement client-scope pour piloter l’arbitrage CODIR sans impacter le cycle de vie `Project`. Le coeur V1 couvre modeles Prisma, RBAC, CRUD cycles/items, scoring explicable, agregats summary et trace audit.

---

## 8) Points de vigilance

1. Ne jamais propager une decision de cycle vers `Project.status` en V1.
2. Eviter les N+1 dans `summary` et `by-project` (agregation SQL/Prisma).
3. Garantir la lisibilite metier cote API (retours enrichis par noms/codes, pas IDs seuls exploites par le front).
4. Maintenir l’isolation multi-client sur toutes les jointures d’objets references.
5. Conserver la responsabilite metier dans le service Nest, pas dans le controller.
