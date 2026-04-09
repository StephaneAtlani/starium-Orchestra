# RFC-FE-BUD-030 — Forecast & Comparaison budgétaire UI

## Statut

Implémenté (MVP) — aligné dépôt **2026-03** (voir §14).

## Priorité

🔥🔥🔥 Haute

## Dépendances

* RFC-BUD-030 — Forecast & Comparaison (backend)
* RFC-016 — Budget Reporting API
* RFC-FE-002 — Budget Cockpit UI
* RFC-024 — Budget Planning UI

---

# 1. Objectif

Permettre à la **DAF / DG** de :

* comprendre rapidement la situation budgétaire réelle
* identifier les dérives (forecast vs budget)
* comparer un budget avec :

  * baseline
  * snapshot
  * version
* naviguer facilement du cockpit → enveloppe → ligne → détail

---

# 2. Portée

## Inclus

* affichage forecast (budget / enveloppe / ligne)
* vue comparaison (baseline / snapshot / version)
* statuts visuels (OK / WARNING / CRITICAL)
* drill-down depuis cockpit
* UI cohérente avec le reste du module budget

## Exclus

* édition forecast
* simulation
* workflow
* IA prédictive

---

# 3. Architecture Frontend

## Structure

Les clients HTTP restent sous `features/budgets/api/` ; les écrans et hooks sous `features/budgets/forecast/` (évite les imports circulaires et suit le plan d’implémentation).

```
apps/web/src/features/budgets/
  api/
    budget-forecast.api.ts          # getBudgetForecast, getEnvelopeForecast, listEnvelopeForecastLines + réexport compare*
    budget-comparison.api.ts        # compareBudget, compareSnapshots, compareVersions
    budget-snapshots.api.ts         # listBudgetSnapshots (sélecteur snapshot)
    budget-versioning.api.ts        # getVersionHistory (sélecteur version)
  types/
    budget-forecast.types.ts
    budget-snapshots-list.types.ts
    budget-version-history.types.ts
  lib/
    budget-formatters.ts            # formatCurrency (DAF, 2 décimales) pour forecast/comparaison
  forecast/
    components/
      forecast-kpi-cards.tsx
      forecast-kpi-skeleton.tsx
      forecast-table.tsx
      comparison-table.tsx
      forecast-status-badge.tsx
      budget-comparison-selector.tsx
    hooks/
      use-budget-forecast.ts
      use-envelope-forecast.ts
      use-envelope-forecast-lines.ts
      use-budget-comparison.ts
      use-budget-snapshots-for-select.ts
      use-budget-version-history.ts
    lib/
      comparison-diff.ts
    budget-reporting-forecast-page.tsx
```

---

# 4. Endpoints consommés

### Forecast

* `GET /api/budget-forecast/budgets/:id`
* `GET /api/budget-forecast/envelopes/:id`
* `GET /api/budget-forecast/envelopes/:id/lines`

### Comparaison

* `GET /api/budget-comparisons/budgets/:budgetId` (`compareTo`, `targetId` optionnel selon mode)
* `GET /api/budget-comparisons/snapshots` (`leftId`, `rightId`)
* `GET /api/budget-comparisons/versions` (`leftId`, `rightId`)

### Listes pour sélecteurs (hors comparaison directe)

* `GET /api/budget-snapshots?budgetId=…` — libellés options snapshot
* `GET /api/budgets/:id/version-history` — libellés options version (même jeu de versions que la comparaison)

---

# 5. Types Frontend

## ForecastBudget

```ts
type ForecastBudget = {
  totalBudget: number
  totalConsumed: number
  totalForecast: number
  totalRemaining: number
  varianceConsumed: number
  varianceForecast: number
  consumptionRate: number
  forecastRate: number
  alerts: {
    overForecast: number
    overConsumed: number
  }
}
```

---

## ForecastLine

```ts
type ForecastLine = {
  lineId: string
  code: string
  name: string
  budget: number
  consumed: number
  forecast: number
  remaining: number
  varianceConsumed: number
  varianceForecast: number
  consumptionRate: number
  forecastRate: number
  status: 'OK' | 'WARNING' | 'CRITICAL'
}
```

---

## BudgetComparison

```ts
type BudgetComparison = {
  compareTo: 'baseline' | 'snapshot' | 'version'
  totals: {
    budget: number
    forecast: number
    consumed: number
  }
  variance: {
    forecast: number
    consumed: number
  }
  diff: {
    revisedAmount: number
    forecastAmount: number
    consumedAmount: number
  }
  lines: ComparisonLine[]
}
```

---

# 6. UX — Forecast

## 6.1 KPI Cards

Afficher :

* Budget total
* Consommé
* Forecast
* Remaining
* Variance forecast

Couleurs :

* positif → vert
* négatif → rouge

---

## 6.2 Table lignes (enveloppe)

Colonnes :

* code
* nom
* budget
* consommé
* forecast
* variance forecast
* statut

---

## 6.3 ForecastStatusBadge

Composant **`ForecastStatusBadge`** (distinct de `BudgetStatusBadge` statut exercice/budget).

```ts
OK → gris
WARNING → orange
CRITICAL → rouge
```

---

## 6.4 Drill-down

Flux obligatoire :

```
Cockpit
→ Enveloppe
→ Lignes
→ (drawer détail futur)
```

---

# 7. UX — Comparaison

## 7.1 Sélecteur

UI obligatoire :

* type :

  * baseline
  * snapshot
  * version
* targetId si requis

---

## 7.2 Table comparaison

Colonnes :

* ligne
* budget gauche
* budget droite
* diff
* variance forecast
* statut

---

## 7.3 Convention visuelle

* diff > 0 → vert
* diff < 0 → rouge

---

# 8. Hooks

## useBudgetForecast

Clés TanStack Query : `budgetQueryKeys.budgetForecast(clientId, budgetId)` (voir `lib/budget-query-keys.ts`). `staleTime` ~45s ; pas de `keepPreviousData` sur le forecast budget seul.

## useBudgetComparison

`budgetQueryKeys.budgetComparison(clientId, budgetId, compareTo, targetId | undefined)` ; `enabled` false si `snapshot`/`version` sans `targetId`. Une seule query `compareBudget` — pas de fetch parallèle via `useEffect`.

## useEnvelopeForecast / useEnvelopeForecastLines

`budgetQueryKeys.envelopeForecast` / `envelopeForecastLines` ; sur les lignes enveloppe, **`placeholderData: keepPreviousData`** (pagination sans flash).

---

# 9. Performance

* pagination obligatoire sur lignes
* pas de recalcul frontend
* uniquement affichage

---

# 10. Règles importantes

* aucune logique métier côté frontend
* aucun recalcul de variance
* aucune modification des statuts

👉 le frontend affiche uniquement ce que retourne l’API

---

# 11. Tests

## UI

* affichage KPI
* couleurs correctes
* statut badge

## Intégration

* navigation cockpit → enveloppe → lignes
* changement compareTo

---

# 12. Critères de succès

* compréhension immédiate par un DAF
* détection visuelle rapide des dérives
* comparaison claire sans ambiguïté
* cohérence parfaite avec backend

---

# 13. Décision structurante

Le frontend :

> n’interprète jamais les données
> il les **rend lisibles**

---

## 🔥 Conclusion

👉 Cette RFC te donne :

* un cockpit lisible
* une vraie valeur métier DAF
* une cohérence totale avec ton backend

---

## 14. Implémentation (référence dépôt)

| Élément | Réalisation |
|--------|-------------|
| **Route reporting** | `apps/web/src/app/(protected)/budgets/[budgetId]/reporting/page.tsx` → `BudgetReportingForecastPage` |
| **Cockpit** | Lien « Forecast & comparaison » dans `features/budgets/dashboard/components/budget-dashboard-header.tsx` si un budget réel est sélectionné (`budgetReporting(budgetId)`), hors mode agrégé `__ALL__` |
| **Enveloppe** | `app/(protected)/budget-envelopes/[envelopeId]/page.tsx` — bloc CockpitSurfaceCard forecast + `ForecastTable` paginée |
| **Budget détail** | Onglet **Forecast** sur `/budgets/[budgetId]` : `ForecastKpiCards` + liens vers reporting |
| **Tests Vitest** | `forecast-status-badge.spec.ts`, `comparison-diff.spec.ts`, `formatCurrency` dans `budget-formatters.spec.ts` |

Hors scope documenté ici : **drawer détail ligne** au clic (placeholder / futur).
