# RFC-FE-BUD-031 — Portefeuille budgets UI (refonte mockup)

## Statut

**Draft — plan d’implémentation**

## Titre

**Portefeuille multi-budgets — accueil pilotage + alignement fiche budget sur la refonte Portail Client**

## Référence design

Mockup produit : *Refonte Portail Client — Starium (standalone)* — section `#view-budgets` (`#budgets-home`, `#budgets-detail`, onglet Budget projet).

Objectif : remplacer la liste admin RFC-FE-003 sur `/budgets` par un **portefeuille financier CODIR** (consolidation exercice, cartes cliquables, table exécution), puis aligner la fiche `/budgets/[budgetId]` sur le détail mockup.

---

# 1. Analyse de l’existant

## 1.1 Page `/budgets` actuelle (RFC-FE-003)

| Élément | Implémentation | Écart mockup |
|--------|----------------|--------------|
| Route | `apps/web/src/app/(protected)/budgets/page.tsx` | OK (même route) |
| Données | `GET /api/budgets` — métadonnées seulement | Mockup : montants Alloué / Engagé / Consommé / Reste / Exécution |
| UI | `BudgetsTable` + `BudgetsToolbar` dans une `Card` | Mockup : bandeau consolidation + grille cartes + toggle Cartes/Tableau |
| Navigation détail | Lien vers `/budgets/[id]` | Mockup : même flux, rendu différent |

## 1.2 APIs déjà disponibles (à réutiliser)

| Endpoint | Usage mockup |
|----------|----------------|
| `GET /api/budget-reporting/exercises/:id/summary` | Bandeau **consolidation** (`mb-consol`) pour l’exercice sélectionné |
| `GET /api/budget-reporting/exercises/:id/budgets` | Cartes + table portefeuille avec KPI par budget (`BudgetListItemWithKpi`) |
| `GET /api/budget-reporting/budgets/:id/summary` | KPI fiche budget (déjà consommé) |
| `GET /api/budget-exercise-options` (via hook existant) | Sélecteur exercice (= toggle année mockup) |
| `GET /api/budgets` | **Conservé** pour admin / exports ; **plus** source principale de `/budgets` |

Client API frontend : `apps/web/src/features/budgets/api/budget-reporting.api.ts` (`getExerciseSummary`, `listBudgetsForExercise`).

## 1.3 Fiche budget `/budgets/[budgetId]`

Composants existants réutilisables :

- `BudgetDetailDashboard` + `BudgetKpiCard` (cockpit) — remplacer `BudgetKpiCards` (legacy Card×N)
- `BudgetExplorerTable` — table catégories / lignes
- `BudgetViewTabs` — onglets pilotage
- `BudgetMonthlyTrendCard` (dashboard) — courbe consommation
- Modales métier partielles (snapshot, ligne, import wizard)

## 1.4 Écrans voisins (hors périmètre direct)

| Route | Rôle | Relation mockup |
|-------|------|-----------------|
| `/budgets/dashboard` | Cockpit CODIR configurable (RFC-FE-002) | Complémentaire — widgets multi-budgets, pas le portefeuille « choix budget » |
| `/budgets/exercises` | Liste admin exercices (RFC-FE-003) | Inchangé — reste sous Configuration |
| Onglet Budget fiche projet | KPI projet | Mockup séparé (`tab-pane budget`) — RFC ultérieure si parité visuelle |

## 1.5 Références DS / patterns

- Portefeuille projets : `apps/web/src/app/(protected)/projects/page.tsx` + `ProjectsPortfolioKpi`
- Tokens / classes : `docs/FRONTEND_UI-UX.md` §2.1, §6.1, §8
- Modales : `StariumModal` (`docs/design-system/MODALES.md`)

---

# 2. Hypothèses

| # | Hypothèse | Impact si fausse |
|---|-----------|------------------|
| H1 | Le portefeuille mockup est **scopé par exercice** (toggle 2025/2024 = exercice budgétaire) | Besoin d’un agrégat multi-exercices + gestion multi-devises |
| H2 | Pas de champ « Type budget » (Direction / Support / Portefeuille projets) en base MVP | Badge « Type » mockup masqué ou dérivé du statut / code en V1 |
| H3 | La route `/budgets/[budgetId]` reste la cible du clic carte (App Router, pas SPA inline) | Aucun — UX équivalente |
| H4 | Export portefeuille V1 = **CSV** des lignes visibles (table mode) | PDF = phase ultérieure |
| H5 | RFC-FE-003 reste valide pour `/budgets/exercises` ; seule la page `/budgets` change de sémantique visuelle | Doc module budget à mettre à jour |

---

# 3. Périmètre

## Inclus

### Lot A — Accueil portefeuille `/budgets`

- `PageHeader` avec eyebrow, actions (Dashboard, Nouveau budget)
- Toolbar : toggle **Cartes / Tableau**, sélecteur **exercice**, bouton **Exporter**
- Bandeau consolidation 5 cellules (`mb-consol` → DS)
- Grille cartes budget (`mb-card`) — nom, montant alloué, barre exécution, engagé/consommé, alerte dépassement
- Table portefeuille financière (colonnes mockup)
- Filtres URL : `exerciseId`, `view=cards|table`, recherche, statut (optionnel V1)
- États loading / empty / error conformes DS
- Clic → `/budgets/[budgetId]`

### Lot B — Fiche budget `/budgets/[budgetId]` (alignement mockup)

- Header : retour portefeuille, switch budget (Select libellé), actions primaires
- Bande KPI unifiée 5–6 indicateurs avec barres (`bud-kpis`)
- Layout 2 colonnes : courbe consommation + donut / alerte
- Segmented control sous-onglets : Synthèse | Catégories | Engagements & factures (mapping sur composants existants)
- Filtre CAPEX/OPEX si données enveloppes disponibles

### Lot C — Modales mockup (MVP ciblé)

- « Saisir une dépense » → `StariumModal` (branchement orders/invoices existant ou placeholder action + lien module Achats si absent)
- Réaffectation → lien `/budgets/[id]/reallocations` en V1 si modale complexe

## Exclus (phases ultérieures)

- Nouveau endpoint `GET /api/budgets/portfolio-summary` **sans exercice** (multi-devises)
- Champ configurable « type portefeuille budget » en admin studio
- Fusion `/budgets/dashboard` et `/budgets` en un seul écran
- Parité complète onglet Budget **fiche projet**
- Import / forecast / réaffectation modales multi-budgets du mockup JS (`ui_kits/app/budget/*`) si non branchées API

---

# 4. Architecture cible

## 4.1 Routes

| Route | Rôle après refonte |
|-------|-------------------|
| `/budgets` | **Portefeuille** — mockup `#budgets-home` |
| `/budgets/[budgetId]` | **Pilotage budget** — mockup `#budgets-detail` |
| `/budgets/dashboard` | Cockpit CODIR (inchangé) |
| `/budgets/exercises` | Admin exercices (inchangé) |

## 4.2 Structure frontend

```
apps/web/src/features/budgets/portfolio/
├── components/
│   ├── budgets-portfolio-page.tsx          # shell (RequireActiveClient + PageContainer)
│   ├── budgets-portfolio-header.tsx        # PageHeader + actions
│   ├── budgets-portfolio-toolbar.tsx       # view toggle + exercice + export
│   ├── budgets-portfolio-consol.tsx        # bandeau 5 KPI consolidation
│   ├── budgets-portfolio-card.tsx          # carte mb-card
│   ├── budgets-portfolio-card-grid.tsx
│   ├── budgets-portfolio-table.tsx         # table financière
│   └── budgets-portfolio-empty-state.tsx
├── hooks/
│   ├── use-budgets-portfolio-filters.ts    # URL: exerciseId, view, search, status
│   ├── use-budgets-portfolio-exercise.ts   # exercice actif ( défaut = plus récent ACTIVE )
│   ├── use-exercise-summary-query.ts
│   └── use-exercise-budgets-with-kpi-query.ts
├── lib/
│   ├── budget-portfolio-format.ts          # montants, %, alertes
│   └── budget-portfolio-export.ts          # CSV export
└── types/
    └── budget-portfolio.types.ts
```

Fiche budget — refactor incrémental dans `features/budgets/components/` :

- `budget-detail-header.tsx` (nouveau)
- `budget-detail-kpi-strip.tsx` (nouveau — remplace usage direct `BudgetKpiCards`)
- `budget-detail-synthesis-panel.tsx` (chart + donut + alerte)

## 4.3 Mapping mockup → composants DS

| Mockup | Starium |
|--------|---------|
| `.mb-consol` / `.mb-cons-cell.lead` | `.starium-module` + grille 5 × `KpiCard variant="dense"` ; lead = tint gold |
| `.mb-card` | Composant dédié tokens `rounded-[var(--radius-lg)] border-border bg-card shadow-1` |
| `.seg-toggle` / `.seg-btn` | `.starium-tab-group` / `.starium-tab-btn` |
| `.mb-sec-label` | `.starium-overline` |
| `.bud-kpis` | **Une** bande `border border-border rounded-lg grid` — pas N `Card` séparées |
| `.bud-subtabs` | `.starium-tab-group` |
| `.dt` | `Table` + `StariumTableWrap` + `tabular-nums` |
| Modales | **`StariumModal`** obligatoire |

Couleurs sémantiques :

- Engagé → `--brand-gold`
- Consommé → `--state-info`
- Reste OK → `--state-success`
- Dépassement → `--state-danger`

---

# 5. Contrats API (réutilisation — pas de Prisma MVP)

## 5.1 Consolidation exercice

```http
GET /api/budget-reporting/exercises/:exerciseId/summary
```

Champs utilisés pour `mb-consol` :

- `totalInitialAmount` → Alloué
- `totalCommittedAmount` → Engagé
- `totalConsumedAmount` → Consommé
- `totalRemainingAmount` → Reste
- `totalForecastAmount` → Prévision
- `consumptionRate` / `commitmentRate` → barre exécution cellule lead

## 5.2 Liste budgets avec KPI

```http
GET /api/budget-reporting/exercises/:exerciseId/budgets?limit=&offset=&search=&status=
```

Réponse : `PaginatedReportingResponse<BudgetListItemWithKpi>`.

Mapping carte :

| Mockup | Source |
|--------|--------|
| Nom | `budget.name` |
| Alloué | `kpi.totalInitialAmount` |
| Engagé / Consommé pied | `kpi.totalCommittedAmount` / `kpi.totalConsumedAmount` |
| Barre | `kpi.consumptionRate` ou `committed/total` |
| État | `BudgetStatusBadge` sur `budget.status` |
| Alerte | `kpi.forecastAmount > kpi.totalInitialAmount` ou lignes over* |

## 5.3 Extension API optionnelle (Lot B+ — seulement si perf insuffisante)

`GET /api/budget-reporting/exercises/:id/budgets` charge déjà les KPI en batch — **pas nécessaire en V1**.

Si consolidation sans exercice requis plus tard :

```http
GET /api/budget-reporting/portfolio-summary?exerciseId=
```

→ aligné sur `GET /api/contracts/summary` et `GET /api/projects/portfolio-summary`.

---

# 6. Modifications Prisma

**Aucune en MVP.**

Extension future possible : `Budget.portfolioType` enum (DIRECTION, SUPPORT, PROJECTS) — admin configurable.

---

# 7. Plan d’implémentation par phases

## Phase 0 — Préparation (0,5 j)

- [ ] Valider exercice par défaut (dernier `ACTIVE` ou premier de `budget-exercise-options`)
- [ ] Créer dossier `features/budgets/portfolio/`
- [ ] Hooks query keys : `budgetQueryKeys.exerciseSummary(clientId, exerciseId)`, `exerciseBudgetsWithKpi(clientId, exerciseId, filters)`
- [ ] Tests fixtures seed cockpit existant

## Phase 1 — Portefeuille home (2–3 j)

1. `use-budgets-portfolio-filters.ts` — sync URL (`exerciseId`, `view`, `search`, `page`)
2. `budgets-portfolio-consol.tsx` — `useExerciseSummaryQuery`
3. `budgets-portfolio-card.tsx` + `card-grid.tsx`
4. `budgets-portfolio-table.tsx` — colonnes mockup, mobile cartes (`DataTable` ou pattern projets)
5. `budgets-portfolio-toolbar.tsx` — toggles DS
6. Remplacer contenu `apps/web/src/app/(protected)/budgets/page.tsx` → `<BudgetsPortfolioPage />`
7. Conserver `BudgetsTable` / `BudgetsToolbar` **deprecated** ou déplacer sous `/budgets/configuration` si encore utiles admin

**DoD Phase 1**

- [ ] Parité visuelle mockup home (structure, pas pixel-perfect)
- [ ] Montants réels API reporting
- [ ] Libellés exercice en UI (jamais UUID)
- [ ] `pnpm --filter @starium-orchestra/web typecheck` + tests vitest hooks/format

## Phase 2 — Fiche budget (3–4 j)

1. `budget-detail-header.tsx` — retour, Select budgets exercice, CTA
2. `budget-detail-kpi-strip.tsx` — 5–6 KPI + barres (`BudgetKpiCard`)
3. Refactor `budgets/[budgetId]/page.tsx` — layout `g-budget` / `mb-grid2`
4. Brancher `BudgetMonthlyTrendCard` ou reporting burn chart
5. Mapper `BudgetViewTabs` → libellés mockup (Synthèse / Catégories / Engagements)
6. Filtre CAPEX/OPEX sur explorateur si `envelope.type` disponible

**DoD Phase 2**

- [ ] KPI strip unifiée (anti cadre-dans-cadre)
- [ ] Navigation switch budget sans ID brut visible
- [ ] Mobile 320px — cartes KPI 2 colonnes, table scroll contrôlé

## Phase 3 — Actions & modales (2 j)

1. CTA « Saisir une dépense » → `StariumModal` (workflow existant ou stub documenté)
2. Export CSV portefeuille (`budget-portfolio-export.ts`)
3. Lien Dashboard / Reporting depuis header fiche

## Phase 4 — Doc & dépréciation RFC-FE-003 (0,5 j)

- [ ] Mettre à jour `docs/modules/budget-frontend.md`
- [ ] Mettre à jour `docs/FRONTEND_ARCHITECTURE.md` § routes `/budgets`
- [ ] Noter dans RFC-FE-003 : liste `/budgets` **supersédée visuellement** par RFC-FE-BUD-031

---

# 8. Fichiers à créer / modifier

## Créer

| Fichier |
|---------|
| `docs/RFC/RFC-FE-BUD-031 — Portefeuille budgets UI (refonte mockup).md` |
| `apps/web/src/features/budgets/portfolio/**` (voir §4.2) |
| `apps/web/src/features/budgets/hooks/use-exercise-summary-query.ts` |
| `apps/web/src/features/budgets/hooks/use-exercise-budgets-with-kpi-query.ts` |
| `apps/web/src/features/budgets/components/budget-detail-header.tsx` |
| `apps/web/src/features/budgets/components/budget-detail-kpi-strip.tsx` |
| `apps/web/src/features/budgets/portfolio/**/*.spec.ts` |

## Modifier

| Fichier | Changement |
|---------|------------|
| `apps/web/src/app/(protected)/budgets/page.tsx` | Déléguer à `BudgetsPortfolioPage` |
| `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` | Layout mockup détail |
| `apps/web/src/features/budgets/lib/budget-query-keys.ts` | Clés portfolio |
| `docs/RFC/_RFC Liste.md` | Index RFC-FE-BUD-031 |
| `docs/modules/budget-frontend.md` | Section portefeuille |
| `docs/API.md` | Note usage reporting pour UI portefeuille (si absent) |

## Déprécier (ne pas supprimer immédiatement)

| Fichier | Note |
|---------|------|
| `budgets-table.tsx` | Admin fallback ou tests RFC-FE-003 |
| `budget-kpi-cards.tsx` | Remplacé par `BudgetKpiCard` strip |

---

# 9. Tests

## Backend

- Réutiliser tests existants `budget-reporting.service.spec.ts` / integration
- Pas de nouveau endpoint MVP → pas de tests controller supplémentaires

## Frontend

| Test | Cible |
|------|-------|
| `budget-portfolio-format.spec.ts` | % exécution, alerte dépassement, format montant |
| `use-budgets-portfolio-filters.spec.ts` | sync URL exerciseId + view |
| `budgets-portfolio-consol.spec.tsx` | rendu 5 KPI, état loading |
| `budgets-portfolio-card.spec.tsx` | libellé budget, pas d’ID visible |
| E2E manuel | clic carte → fiche, switch exercice, toggle cartes/table |

## Non-régression

- `data-testid` RFC-FE-003 : migrer ou conserver alias sur nouveaux composants
- Isolation client : query keys incluent `clientId`
- Permission `budgets.read` — masquer page si absent (pattern `/projects`)

---

# 10. Récapitulatif

| Livrable | Description |
|----------|-------------|
| **Lot A** | `/budgets` = portefeuille financier mockup |
| **Lot B** | `/budgets/[id]` aligné détail mockup |
| **Lot C** | Export + modale dépense MVP |
| **API** | Réutilisation `budget-reporting` — **zéro migration Prisma V1** |
| **Effort estimé** | **8–10 j** dev + revue DS |

Commandes de vérification :

```bash
pnpm --filter @starium-orchestra/web typecheck
pnpm --filter @starium-orchestra/web test
pnpm audit:modals   # si modales Phase 3
pnpm --filter @starium-orchestra/api test -- budget-reporting
```

---

# 11. Points de vigilance

1. **Multi-devises** : `listBudgetsForExercise` lève 400 si un budget mélange les devises — afficher `ErrorState` explicite, pas de crash silencieux.
2. **Exercice sans budgets** : consolidation à zéro + empty state « Aucun budget sur cet exercice » + CTA créer.
3. **Confusion `/budgets` vs `/budgets/dashboard`** : libellés sidebar + eyebrow « Portefeuille » vs « Dashboard CODIR ».
4. **Performance** : pagination sur table ; cartes = limit raisonnable (20) ou lazy load si > 12.
5. **RFC-FE-003** : ne pas casser `/budgets/exercises` ni tests conformité existants.
6. **ACL / scope org** : s’assurer que `listBudgetsForExercise` respecte le filtrage lecture budget (RFC-ACL-020) — vérifier service reporting vs liste CRUD.

---

# 12. Conformité by design

## RGPD

- **DCP** : nom responsable budget (`ownerUserName`) si affiché — finalité pilotage interne client ; minimiser (pas d’email en liste sauf nécessité).
- **Logs** : pas de montants personnels en clair côté client ; API errors sans payload utilisateur.
- **Scope client** : exercice et budgets filtrés `clientId` actif.

## RGAA

- Toggle Cartes/Tableau : boutons natifs, état actif annoncé (`aria-pressed` ou `aria-current`).
- Cartes cliquables : `<button>` ou `<a>` avec label explicite « Ouvrir le budget {nom} ».
- Table : en-têtes `<th scope="col">`, navigation clavier lignes.
- Bandeau KPI : texte lisible, pas info par couleur seule (barre + % + libellé).
- `aria-live="polite"` sur changement exercice / chargement consolidation.

## Design System

- Tokens uniquement ; pas de hex mockup en dur.
- `PageHeader`, `KpiCard`, `LoadingState`, `EmptyState`, `ErrorState`, `FilterBar`, `StariumTableWrap`.
- États loading/empty/error sur consolidation, grille et table.
- **Valeur, pas ID** : exercice, budget, responsable — libellés métier.

## Sécurité

- Permission `budgets.read` sur toutes les lectures reporting.
- Pas de `clientId` / `exerciseId` issus du payload non validé — dérivés du scope auth + options autorisées.
- Export CSV : mêmes données que l’utilisateur peut lire (pas de contournement ACL).

## Interface mobile

- Cartes : grille `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Consolidation : `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` ; cellule lead full width mobile.
- Cibles tactiles ≥ 44px sur cartes et toggles.
- Table : stratégie mobile cartes empilées (pattern `DataTable` ou `projects-list-mobile-view`).

---

# 13. Liens RFC

| RFC | Relation |
|-----|----------|
| RFC-FE-003 | Supersédée visuellement pour `/budgets` ; exercices inchangés |
| RFC-FE-002 | Cockpit dashboard — complémentaire |
| RFC-FE-004 | Explorateur — réutilisé en onglet Catégories |
| RFC-016 | Budget Reporting API — source KPI |
| RFC-FE-BUD-030 | Reporting / forecast — liens depuis fiche |
