# RFC-FE-BUD-030 — Forecast & Comparaison budgétaire UI

## Statut

Draft

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

```
apps/web/src/features/budgets/
  forecast/
    api/
      budget-forecast.api.ts
      budget-comparison.api.ts
    types/
      budget-forecast.types.ts
      budget-comparison.types.ts
    components/
      ForecastKpiCards.tsx
      ForecastTable.tsx
      ComparisonTable.tsx
      StatusBadge.tsx
    hooks/
      useBudgetForecast.ts
      useBudgetComparison.ts
```

---

# 4. Endpoints consommés

### Forecast

* `GET /api/budget-forecast/budgets/:id`
* `GET /api/budget-forecast/envelopes/:id`
* `GET /api/budget-forecast/envelopes/:id/lines`

### Comparaison

* `GET /api/budget-comparisons/budgets/:budgetId`
* `GET /api/budget-comparisons/snapshots`
* `GET /api/budget-comparisons/versions`

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

## 6.3 StatusBadge

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

```ts
useQuery(['budgetForecast', budgetId])
```

## useBudgetComparison

```ts
useQuery(['budgetComparison', params])
```

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
