# RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI

## Statut

📝 **Draft** — specification cible pour implementation frontend V1.

**Depend de** : [RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md), [RFC-STRAT-003 — Strategic Vision Frontend UI](./RFC-STRAT-003%20%E2%80%94%20Strategic%20Vision%20Frontend%20UI.md).

---

## 1) Analyse de l’existant

- Le frontend Starium est organise en mode feature-first, avec pages `app/` et logique metier UI dans `features/`.
- Le projet utilise TanStack Query + contracts types/schemas et des query keys tenant-aware.
- La navigation et les permissions sont deja centralisees dans la config sidebar.
- Il n’existe pas encore de pages `/cycles` ni de feature dediee a l’arbitrage CODIR.

---

## 2) Hypotheses eventuelles

- V1 privilegie la valeur metier lisible et l’exploitabilite CODIR, pas l’exhaustivite visuelle.
- L’onglet `Documents` de la page detail peut etre un placeholder en V1.
- Le MVP d’ajout d’items commence par `PROJECT`, `BUDGET`, `MANUAL`, puis extension progressive.

---

## 3) Liste des fichiers a creer / modifier

**Creer**

- `apps/web/src/app/(protected)/cycles/page.tsx`
- `apps/web/src/app/(protected)/cycles/[cycleId]/page.tsx`
- `apps/web/src/features/governance-cycles/api/governance-cycles.api.ts`
- `apps/web/src/features/governance-cycles/hooks/use-governance-cycles.ts`
- `apps/web/src/features/governance-cycles/types/governance-cycle.types.ts`
- `apps/web/src/features/governance-cycles/schemas/governance-cycle.schemas.ts`
- `apps/web/src/features/governance-cycles/lib/governance-cycles-query-keys.ts`
- composants UI:
  - `governance-cycles-page.tsx`
  - `governance-cycle-detail-page.tsx`
  - `governance-cycle-form-dialog.tsx`
  - `governance-cycle-arbitration-table.tsx`
  - `add-cycle-item-dialog.tsx`

**Modifier**

- `apps/web/src/config/navigation.ts`
- `apps/web/src/components/shell/sidebar.tsx`

---

## 4) Implementation complete

### 4.1 Routes et navigation

- Ajouter entree sidebar `Cycles de pilotage` dans la section Gouvernance.
- Route principale: `/cycles`.
- Route detail: `/cycles/[cycleId]`.
- Condition d’affichage: permission `governance_cycles.read`.

### 4.2 Query keys tenant-aware

```ts
export const governanceCyclesKeys = {
  all: (clientId: string) => ['governance-cycles', clientId] as const,
  lists: (clientId: string) => ['governance-cycles', clientId, 'list'] as const,
  list: (clientId: string, filters: object) => ['governance-cycles', clientId, 'list', filters] as const,
  detail: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'detail', cycleId] as const,
  items: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'items', cycleId] as const,
  summary: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'summary', cycleId] as const,
};
```

### 4.3 Page liste `/cycles`

Composants attendus :

- `PageHeader`
- KPI row (`Cycles actifs`, `A arbitrer`, `En execution`, `Clotures`)
- toolbar filtres (`search`, `status`, `cadence`, `period`)
- table paginee

Colonnes minimales :

- Nom
- Cadence
- Periode
- Statut
- Items
- A arbitrer
- Budget estime
- Capacite estimee
- Derniere mise a jour
- Actions

Actions :

- creer
- ouvrir
- modifier
- archiver

### 4.4 Page detail `/cycles/[cycleId]`

Header :

- breadcrumb
- titre + badge statut
- meta (periode, cadence, sponsor, createur)
- actions contextualisees

Onglets V1 :

- Vue d’ensemble
- Matrice d’arbitrage
- Projets candidats
- Budget & capacite
- Risques
- Decisions
- Documents (placeholder autorise)

### 4.5 UX d’arbitrage

La matrice affiche au minimum :

- element (valeur metier)
- type
- scores (valeur, alignement, budget, capacite, risque)
- score global
- decision
- motif
- actions ligne

Actions ligne :

- Retenir
- Differer
- Refuser
- Demander complement
- Accepter sous reserve
- Modifier scores
- Supprimer du cycle

---

## 5) Modifications Prisma si necessaire

Pas de modification Prisma frontend. Cette RFC consomme les contrats backend de [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md).

---

## 6) Tests

### Frontend unit/integration

- query keys incluant toujours `clientId`
- etats `loading/error/empty/success` sur liste et detail
- affichage conditionnel par permission `governance_cycles.read`
- form cycle: labels metier FR et mapping enum -> label
- matrice: aucune colonne n’affiche `projectId`, `budgetId`, `riskId`, `objectiveId` en clair
- add item dialog: recherche metier par label/code, pas par UUID visible

### UX obligatoire (regle Starium)

- tous les selects/combobox/tables affichent des valeurs metier (`name`, `code`, `label`, `title`) et jamais un ID brut comme texte principal.

---

## 7) Recapitulatif final

Cette RFC pose une UI governance-cycles complete cote frontend, branchee sur les APIs backend sans logique d’arbitrage critique en React. Elle couvre navigation, liste, detail, matrice de decision et ajout d’items, tout en respectant les conventions tenant-aware et "valeur metier, pas ID".

---

## 8) Points de vigilance

1. Ne pas dupliquer la logique de scoring backend dans le frontend.
2. Eviter la fuite de references techniques (UUID) dans tous les composants visibles.
3. Conserver une invalidation cache coherente apres mutation cycle/item.
4. Ne pas exposer l’entree nav si module desactive ou permission absente.
5. Garder la page detail performante (chargement segmente par onglet si besoin).
