# 📄 RFC-030 — Budget Forecast & Comparaison Budgétaire

## Statut

Draft

## Priorité

🔥 Haute (pilotage DG / DAF)

## Dépendances

* RFC-015-1B — Financial Core 
* RFC-016 — Budget Reporting API 
* RFC-015-3 — Budget Snapshots 
* RFC-019 — Budget Versioning 

---

# 1. Objectif

Introduire une couche métier permettant :

### 1. Forecast budgétaire

* projeter la fin d’exercice
* anticiper les dérives
* produire un **atterrissage budgétaire fiable**

### 2. Comparaison budgétaire

* comparer :

  * réel vs budget
  * forecast vs budget
  * version vs version
  * snapshot vs snapshot

👉 Finalité : **pilotage décisionnel DG / DAF**

---

# 2. Problème

Aujourd’hui :

* les montants existent (forecast / committed / consumed)
* mais :

  * pas de projection intelligente
  * pas de comparaison structurée
  * pas de lecture “écart / dérive”

👉 Impossible de répondre à :

* Où va mon budget ?
* Vais-je dépasser ?
* Quelle dérive vs budget initial ?

---

# 3. Concepts métier

---

## 3.1 Forecast

Le **forecast** est une projection de fin d’exercice.

### Source :

* allocations (`FORECAST`)
* événements (`COMMITMENT_REGISTERED`, `CONSUMPTION_REGISTERED`)
* logique métier (run rate)

---

## 3.2 Types de forecast

### 1 — Forecast actuel (MVP)

```
forecast = BudgetLine.forecastAmount
```

➡️ issu du financial-core

---

### 2 — Forecast recalculé (phase avancée)

```
forecast =
consumed
+ committed restant
+ projection mensuelle
```

---

### 3 — Forecast intelligent (future IA)

* basé sur historique
* saisonnalité
* pattern consommation

---

## 3.3 Variance

Écart entre deux valeurs :

```
variance = reference - actual
```

Exemples :

```
budget vs consumed
budget vs forecast
forecast vs snapshot
```

---

## 3.4 Atterrissage (landing)

Projection finale :

```
landing = forecast
```

---

# 4. Périmètre MVP

## Inclus

* forecast basé sur données existantes
* calcul des variances
* comparaison simple
* API de comparaison
* agrégation multi-niveaux

## Exclus

* IA prédictive
* simulation avancée
* multi-scenarios

---

# 5. Modèle de données

👉 Aucun nouveau modèle requis (MVP)

On exploite :

* `BudgetLine.forecastAmount`

* `BudgetLine.revisedAmount`

* `BudgetLine.consumedAmount`

* `BudgetSnapshot`

* `Budget`

---

# 6. Calculs métier

---

## 6.1 KPI par ligne

```
budget = revisedAmount
consumed = consumedAmount
forecast = forecastAmount

varianceConsumed = budget - consumed
varianceForecast = budget - forecast

consumptionRate = consumed / budget
forecastRate = forecast / budget
```

---

## 6.2 Détection dérives

```
if forecast > budget → OVER_FORECAST
if consumed > budget → OVER_CONSUMED
if remaining < 0 → NEGATIVE_REMAINING
```

---

## 6.3 Projection globale

Agrégation via RFC-016 :

* somme des lignes
* ratios globaux

---

# 7. API

---

## 7.1 Forecast budget

```
GET /api/budget-forecast/budgets/:id
```

### Response

```
{
  totalBudget: number,
  totalConsumed: number,
  totalForecast: number,
  totalRemaining: number,

  varianceForecast: number,
  forecastRate: number,

  alerts: {
    overForecast: number,
    overConsumed: number
  }
}
```

---

## 7.2 Forecast enveloppe

```
GET /api/budget-forecast/envelopes/:id
```

---

## 7.3 Forecast lignes

```
GET /api/budget-forecast/envelopes/:id/lines
```

➡️ drill-down

---

## 7.4 Comparaison budget vs réel

```
GET /api/budget-comparisons/budgets/:id
```

### Query

```
compareTo=baseline|snapshot|version
targetId=optional
```

---

## 7.5 Comparaison snapshots

```
GET /api/budget-comparisons/snapshots
?leftId=
&rightId=
```

👉 utilise RFC-015-3 

---

## 7.6 Comparaison versions

```
GET /api/budget-comparisons/versions
?leftId=
&rightId=
```

👉 utilise RFC-019 

---

# 8. Structure réponse comparaison

```
{
  totals: {
    budget: number,
    forecast: number,
    consumed: number
  },

  variance: {
    forecast: number,
    consumed: number
  },

  diff: {
    revisedAmount: number,
    forecastAmount: number,
    consumedAmount: number
  },

  lines: [
    {
      lineId,
      name,
      varianceForecast,
      varianceConsumed,
      status
    }
  ]
}
```

---

# 9. Statuts métier

```
OK
WARNING
CRITICAL
```

Définition :

```
OK → forecast <= budget
WARNING → forecast > budget
CRITICAL → consumed > budget
```

---

# 10. Architecture backend

Module :

```
apps/api/src/modules/budget-forecast
```

Structure :

```
budget-forecast
 ├ controller
 ├ service
 ├ calculators
 ├ mappers
 └ dto
```

---

## Dépendances

* Prisma
* budget-reporting
* financial-core

---

# 11. Sécurité

Guards standards :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permission :

```
budgets.read
```

---

# 12. Audit

Logs à produire :

```
budget.forecast.viewed
budget.comparison.viewed
```

---

# 13. Performance

MVP :

* calcul à la volée

Optimisations futures :

* cache Redis
* pré-agrégation

---

# 14. Tests

### unit

* variance
* ratios
* détection dérives

### integration

* multi-client
* permissions
* cohérence snapshot vs live

---

# 15. Impact frontend

Permet :

* cockpit budget (phase 0)
* vue enveloppe (phase 3)
* drill-down lignes
* alertes visuelles

---

# 🎯 Conclusion

👉 Cette RFC est **clé produit**

Elle transforme ton module budget :

* de stockage → pilotage
* de technique → décisionnel

👉 C’est elle qui rend ton SaaS **vendable à un DAF**

