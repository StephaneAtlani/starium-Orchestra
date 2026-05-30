# RFC-FE-PROJ-CYCLE-001 — Governance Cycles Frontend UI

## Statut

✅ **Implémenté** (2026-05-30) — UI V1 livrée : routes `/cycles`, liste, détail multi-onglets, matrice d’arbitrage, query keys tenant-aware, tests Vitest.

**Plan d’exécution** : [_Plan de développement - Cycles de pilotage.md](./_Plan%20de%20d%C3%A9veloppement%20-%20Cycles%20de%20pilotage.md) (lots F1–F8).

**Prérequis backend (2026-05-30)** : API cycles + items + **scoring §4.5** + **KPI global B7** (`GET …/:id/summary`) + **audits / transitions** `TO_ARBITRATE` / `CLOSED` (lot B8) + **`by-project`** (lot B9 — [RFC-PROJ-CYCLE-002](./RFC-PROJ-CYCLE-002%20%E2%80%94%20Project%20Integration%20for%20Governance%20Cycles.md)) opérationnels ([API.md](../API.md) §5.8). L’onglet overview CODIR consomme la route summary dédiée ; le champ `summary` embarqué sur `GET :id` reste utilisable pour le header léger.

**Intégration fiche projet (RFC-002)** : bloc read-only `ProjectGovernanceCyclesPresenceBlock` sur `/projects/[id]` — hors feature `/cycles` mais réutilise labels/badges governance-cycles.

**Depend de** : [RFC-PROJ-CYCLE-001 — Governance Cycles Core Backend](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md), [RFC-STRAT-003 — Strategic Vision Frontend UI](./RFC-STRAT-003%20%E2%80%94%20Strategic%20Vision%20Frontend%20UI.md).

**Implémentation repo** : `apps/web/src/features/governance-cycles/` ; routes `apps/web/src/app/(protected)/cycles/` ; navigation `apps/web/src/config/navigation.ts` (entrée « Cycles de pilotage », `moduleCode: governance_cycles`).

---

## 1) Analyse de l’existant

- Le frontend Starium est organise en mode feature-first, avec pages `app/` et logique metier UI dans `features/`.
- Le projet utilise TanStack Query + contracts types/schemas et des query keys tenant-aware.
- La navigation et les permissions sont centralisees dans `apps/web/src/config/navigation.ts` + `navigation-visibility.ts`.
- **Livré** : pages `/cycles` et `/cycles/[cycleId]`, feature `apps/web/src/features/governance-cycles/` (liste, detail, matrice arbitrage, PATCH edition/arbitrage separes, `sourceRef` en UI).

---

## 2) Hypotheses eventuelles

- V1 privilegie la valeur metier lisible et l’exploitabilite CODIR, pas l’exhaustivite visuelle.
- L’onglet `Documents` de la page detail peut etre un placeholder en V1.
- Le MVP d’ajout d’items commence par `PROJECT`, `BUDGET`, `MANUAL`, puis extension progressive.

---

## 3) Liste des fichiers (implémentation livrée)

**Routes App Router**

- `apps/web/src/app/(protected)/cycles/page.tsx`
- `apps/web/src/app/(protected)/cycles/[cycleId]/page.tsx`

**Feature `apps/web/src/features/governance-cycles/`**

| Dossier | Fichiers |
| ------- | -------- |
| `api/` | `governance-cycles.api.ts`, `governance-cycles.queries.ts`, `governance-cycles.mutations.ts` |
| `hooks/` | `use-governance-cycles.ts` (barrel) |
| `types/` | `governance-cycle.types.ts` — string unions locales, **sans** `@prisma/client` ni import `apps/api` |
| `schemas/` | `governance-cycle.schemas.ts` — schémas Zod **séparés** (cycle, create item, patch édition, patch arbitrage `.strict()`) |
| `lib/` | `governance-cycles-query-keys.ts`, `governance-cycle-labels.ts`, `governance-cycle-formatters.ts` |
| `components/` | `governance-cycles-page.tsx`, `governance-cycle-detail-page.tsx`, … badges statut/décision ; **`project-governance-cycles-presence-block.tsx`** (RFC-002 — fiche projet) |

**Navigation**

- `apps/web/src/config/navigation.ts` — entrée « Cycles de pilotage » → `/cycles`, `moduleCode: governance_cycles`, `governance_cycles.read`
- Visibilité : `apps/web/src/components/shell/navigation-visibility.ts` (inchangé — consomme `navigation.ts`)

**Tests Vitest** (`apps/web/src/features/governance-cycles/**/*.spec.ts`, `navigation.spec.ts`, `navigation-visibility.spec.ts`)

---

## 4) Implementation complete

### 4.1 Routes et navigation

- Entree sidebar **PILOTAGE STRATÉGIQUE** : « Cycles de pilotage » → `/cycles`.
- Route detail : `/cycles/[cycleId]`.
- Affichage : `moduleCode: governance_cycles` + permission `governance_cycles.read` (via `navigation-visibility.ts`).

### 4.1b Permissions UI (alignées controller backend)

| Action UI | Permission |
| --------- | ---------- |
| Liste / détail / summary / items / **by-project** (fiche projet) | `governance_cycles.read` |
| Créer cycle ou item | `governance_cycles.create` |
| Modifier cycle, scores item, supprimer item | `governance_cycles.update` |
| Arbitrer (`decisionStatus` / `decisionReason`) | `governance_cycles.arbitrate` |
| Archiver cycle | `governance_cycles.delete` |

Mutations item : **deux PATCH distincts** (schémas Zod séparés) — jamais mélanger édition/scores et arbitrage.

### 4.2 Query keys tenant-aware

```ts
export const governanceCyclesKeys = {
  all: (clientId: string) => ['governance-cycles', clientId] as const,
  lists: (clientId: string) => ['governance-cycles', clientId, 'list'] as const,
  list: (clientId: string, filters: object) => ['governance-cycles', clientId, 'list', filters] as const,
  detail: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'detail', cycleId] as const,
  items: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'items', cycleId] as const,
  summary: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'summary', cycleId] as const,
  byProject: (clientId: string, projectId: string) => ['governance-cycles', clientId, 'by-project', projectId] as const,
};
```

### 4.3 Page liste `/cycles`

- **Synthèse de la page affichée** (4 cartes) — calculée sur les cycles **visibles** de la page courante uniquement ; pas d’agrégat global multi-pages.
- Filtres **serveur** : `search`, `status`, `cadence`, `includeArchived`.
- Filtre **période client-side** (page affichée) : libellé explicite + aide — ne filtre pas l’ensemble paginé côté API.
- Colonnes budget / capacité / à arbitrer : `useQueries` sur `GET …/:id/summary` par cycle visible ; échec isolé → « — ».
- Table paginée (`limit`/`offset`), libellés FR, `sourceRef.label` / nom — jamais UUID en colonne principale.

### 4.4 Page detail `/cycles/[cycleId]`

Header :

- breadcrumb
- titre + badge statut
- meta (periode, cadence, sponsor, createur)
- actions contextualisees

Onglets V1 :

- Vue d’ensemble — consommer `GET /api/governance-cycles/:cycleId/summary` (`GovernanceCycleGlobalSummaryDto` ; query key `summary`) ; header léger peut réutiliser le champ `summary` embarqué du détail cycle
- Matrice d’arbitrage
- Projets candidats
- Budget & capacite
- Risques
- Decisions
- Documents (placeholder autorise)

### 4.5 UX d’arbitrage

- Matrice : élément via `sourceRef.label` ou `title` ; scores 1–5 ; **`priorityScore` affiché depuis l’API uniquement** (aucun recalcul React).
- Actions arbitrage : Retenir, Différer, Refuser, Demander complément, Accepter sous réserve — mutation `patchGovernanceCycleItemArbitration` + schéma dédié.
- Modifier scores : dialog séparé + mutation `patchGovernanceCycleItemEdition`.
- Add-item V1 : types `PROJECT`, `BUDGET`, `MANUAL` ; combobox libellés métier (code — nom).
- Transitions cycle `TO_ARBITRATE` / `CLOSED` : erreurs API **400** affichées telles quelles (toast) — pas de règles métier dupliquées côté React.

---

## 5) Modifications Prisma si necessaire

Pas de modification Prisma frontend. Cette RFC consomme les contrats backend de [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md).

---

## 6) Tests

**Livré** (Vitest, `apps/web`) :

| Fichier | Couverture |
| ------- | ---------- |
| `lib/governance-cycles-query-keys.spec.ts` | `clientId` dans toutes les clés (dont `byProject`) |
| `lib/governance-cycle-labels.spec.ts` | libellés FR, pas d’enum brut |
| `schemas/governance-cycle.schemas.spec.ts` | schémas édition/arbitrage sans champs croisés |
| `components/governance-cycles-page.render.spec.ts` | liste sans UUID visible ; synthèse page |
| `components/governance-cycle-arbitration-table.spec.ts` | `sourceRef.label`, `priorityScore` API |
| `components/project-governance-cycles-presence-block.spec.ts` | RFC-002 : masquage sans permission, labels FR, pas d’UUID en texte |
| `config/navigation.spec.ts` | entrée `/cycles` + `moduleCode` |
| `components/shell/navigation-visibility.spec.ts` | `governance_cycles.read` + module |

Commande : `npm test -- --run src/features/governance-cycles` (depuis `apps/web`).

---

## 7) Recapitulatif final

Cette RFC pose une UI governance-cycles complete cote frontend, branchee sur les APIs backend sans logique d’arbitrage critique en React. Elle couvre navigation, liste, detail, matrice de decision et ajout d’items ; le bloc fiche projet (RFC-002) reutilise les memes libelles/badges. Conventions tenant-aware et « valeur metier, pas ID ».

---

## 8) Points de vigilance

1. Ne pas dupliquer la logique de scoring backend dans le frontend.
2. Eviter la fuite de references techniques (UUID) dans tous les composants visibles.
3. Conserver une invalidation cache coherente apres mutation cycle/item.
4. Ne pas exposer l’entree nav si module desactive ou permission absente.
5. Garder la page detail performante (chargement segmente par onglet si besoin).
