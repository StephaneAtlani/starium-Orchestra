# RFC-PROJ-CYCLE-002 — Project Integration for Governance Cycles

## Statut

✅ **Implémenté** (2026-05-30) — endpoint `by-project` + bloc lecture seule fiche projet `/projects/[id]`.

**Prérequis backend** : [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) — lots B1–B9 livrés (inclut `GET /api/governance-cycles/by-project/:projectId`).

**Prérequis frontend** : [RFC-FE-PROJ-CYCLE-001](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) — UI `/cycles` **livrée** (2026-05-30).

**Plan d’exécution** : [_Plan de développement - Cycles de pilotage.md](./_Plan%20de%20d%C3%A9veloppement%20-%20Cycles%20de%20pilotage.md) (lot I1).

**Dépend de** : [RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md), [RFC-FE-PROJ-002 — Project Detail UI](./RFC-FE-PROJ-002%20%E2%80%94%20Project%20Detail%20UI.md), [RFC-PROJ-012 — Project Sheet](./RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md).

---

## 1) Analyse de l’existant

- La fiche projet centralise deja plusieurs blocs transverses (budget links, risques, planning, documents, options).
- Le besoin metier CODIR est de savoir si un projet est present dans des cycles d’arbitrage et avec quelle decision.
- Le plan cycle impose de garder les modules decouples: l’API d’integration est exposee par `governance-cycles`, pas par `projects`.

---

## 2) Hypotheses eventuelles

- L’integration V1 est strictement read-only cote fiche projet.
- Aucun impact sur `Project.status` ni sur les workflows projet existants.
- L’ordre et la granularite des donnees sont optimises pour un widget compact dans la fiche projet.

---

## 3) Liste des fichiers a creer / modifier

**Creer**

- `apps/api/src/modules/governance-cycles/lib/governance-cycle-period.util.ts` (+ spec)
- `apps/web/src/features/governance-cycles/components/project-governance-cycles-presence-block.tsx` (+ spec)

**Modifier**

- `apps/api/src/modules/governance-cycles/governance-cycles.controller.ts` (route `by-project` **avant** `:id`)
- `apps/api/src/modules/governance-cycles/governance-cycles.service.ts`
- `apps/api/src/modules/governance-cycles/governance-cycles.types.ts`
- `apps/web/src/features/governance-cycles/api/*`, `lib/governance-cycles-query-keys.ts`, hooks
- `apps/web/src/features/projects/components/project-detail-view.tsx`
- `docs/API.md` (ajout endpoint)

---

## 4) Implementation complete

### 4.1 Contrat API

Endpoint:

- `GET /api/governance-cycles/by-project/:projectId`

Permission:

- `governance_cycles.read` (et lecture projet deja geree par guards module/permission).

Reponse cible:

```ts
type GovernanceCyclesByProjectResponse = {
  items: Array<{
    cycleId: string;
    cycleName: string;
    cadence: string;
    periodLabel: string;
    decisionStatus: string;
    priorityScore: number | null;
  }>;
};
```

### 4.2 Regles backend

- verifier que `projectId` appartient au client actif, sinon `404`
- ne retourner que les items/cycles du meme `clientId`
- trier par cycle le plus recent en premier (`updatedAt` cycle puis item)
- **V1 livré** : exclure les cycles `ARCHIVED` (aligné sur `listCycles` sans `includeArchived`)

### 4.3 Integration frontend fiche projet

Bloc "Presence dans les cycles de pilotage" :

- afficher max 3-5 lignes puis lien `Voir tous`
- afficher libelles metier:
  - nom cycle
  - periode
  - decision (badge)
  - score (si present)
- aucun mode edition en V1

Exemple visuel :

- `Cycle CODIR juin 2026 — Retenu`
- `Cycle budget 2026 — Differe`
- `Cycle transformation SI — A arbitrer`

### 4.4 Implémentation repo (2026-05-30)

**Backend**

- Route : `GovernanceCyclesController.listCyclesByProject` — `@Get('governance-cycles/by-project/:projectId')` **avant** `@Get('governance-cycles/:id')`
- Service : `GovernanceCyclesService.listCyclesByProject` — vérif `Project` client-scope, requête unique `GovernanceCycleItem` + join cycle, DTO compact
- `periodLabel` : `buildGovernanceCyclePeriodLabel` (`lib/governance-cycle-period.util.ts`, locale `fr-FR`, spec dédiée)

**Frontend**

- API : `getGovernanceCyclesByProject` ; query key `governanceCyclesKeys.byProject(clientId, projectId)` ; hook `useGovernanceCyclesByProjectQuery`
- Composant : `ProjectGovernanceCyclesPresenceBlock` — monté dans `project-detail-view.tsx` (après budget, avant planning) ; **masqué** sans `governance_cycles.read` (`return null`, query `enabled: false`) ; max **5** lignes + lien « Voir tous les cycles » ; `periodLabel` affiché tel quel (pas de reformatage React)

**Tests**

- Backend : 88 tests module `governance-cycles` (dont `listCyclesByProject` service + controller)
- Frontend : `project-governance-cycles-presence-block.spec.ts` (+ query keys spec)

---

## 5) Modifications Prisma si necessaire

Aucune additionnelle si [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) est en place. Cette RFC consomme `GovernanceCycleItem.projectId`.

---

## 6) Tests

### Backend ✅

- `by-project` retourne uniquement les cycles du client actif
- `404` sur projet hors scope client
- tri et mapping `periodLabel` coherents
- robustesse si `priorityScore` null

### Frontend ✅

- bloc masque si permission absente (`enabled: false`, pas de fetch)
- etats loading/empty/error geres proprement
- badges decision affichent labels metier FR, pas enum brute exposee
- aucune valeur ID brute visible en texte principal

---

## 7) Recapitulatif final

Cette RFC definit une integration minimale, stable et non intrusive entre fiche projet et module cycles: un endpoint dedie cote governance et un bloc read-only cote projet pour donner de la visibilite CODIR sans couplage fort.

---

## 8) Points de vigilance

1. Eviter de recreer ce endpoint sous `/api/projects/...` en V1.
2. Ne jamais declencher d’effet de bord projet depuis la lecture cycles.
3. Garder une terminologie metier harmonisee (`Retenu`, `Differe`, `Refuse`, etc.).
4. Maitriser le volume (pagination/limit) pour ne pas alourdir la fiche projet.
