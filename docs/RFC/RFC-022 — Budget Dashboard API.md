# RFC-022 — Budget Dashboard API

## Objectif

Fournir une **API de cockpit de pilotage budgétaire** permettant d’alimenter le **dashboard principal du module Finance** dans Starium Orchestra.

Cette API doit exposer des **indicateurs synthétiques et temps réel** permettant à un DSI, DAF ou membre du CODIR de visualiser rapidement :

* l’état global des budgets
* les consommations
* les écarts
* les enveloppes à risque
* les tendances d’exécution budgétaire

Cette RFC **n’introduit aucun nouveau modèle Prisma**.

Elle exploite uniquement les données existantes :

* BudgetExercise
* Budget
* BudgetEnvelope
* BudgetLine
* FinancialAllocation
* FinancialEvent

Ces données ont été introduites dans les RFC précédentes. 

---

# 1. Périmètre fonctionnel

L’API doit fournir les données nécessaires pour construire un **cockpit budgétaire composé de plusieurs widgets**.

## Widgets cibles

1. **Budget global**
2. **Consommation budgétaire**
3. **Top enveloppes**
4. **Enveloppes à risque**
5. **Distribution CAPEX / OPEX**
6. **Évolution mensuelle**
7. **Top lignes budgétaires**
8. **KPI principaux**

Le frontend affichera ces données sous forme :

* cartes KPI
* graphiques
* tableaux synthétiques

---

# 2. Structure du module

Créer un module dédié.

```
apps/api/src/modules/budget-dashboard/
```

Structure :

```
budget-dashboard/
├── budget-dashboard.module.ts
├── budget-dashboard.controller.ts
├── budget-dashboard.service.ts
│
├── dto/
│   └── dashboard.query.dto.ts
│
└── types/
    └── budget-dashboard.types.ts
```

---

# 3. Sécurité

Même modèle que les autres modules.

Guards :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permissions :

```
budgets.read
```

Toutes les requêtes sont **scopées par clientId**.

---

# 4. Endpoint principal

## GET /api/budget-dashboard

Retourne la **vue globale du cockpit budgétaire**.

### Query parameters

```
exerciseId (optional)
budgetId (optional)
includeEnvelopes (optional)
includeLines (optional)
```

---

# 5. Réponse API

Structure de réponse :

```ts
{
  exerciseId: string
  budgetId: string

  kpis: {
    totalBudget: number
    committed: number
    consumed: number
    forecast: number
    remaining: number
    consumptionRate: number
  }

  capexOpexDistribution: {
    capex: number
    opex: number
  }

  monthlyTrend: {
    month: string
    committed: number
    consumed: number
  }[]

  topEnvelopes: {
    envelopeId: string
    code: string
    name: string
    totalBudget: number
    consumed: number
    remaining: number
  }[]

  riskEnvelopes: {
    envelopeId: string
    name: string
    forecast: number
    budget: number
    riskLevel: "LOW" | "MEDIUM" | "HIGH"
  }[]

  topBudgetLines: {
    lineId: string
    code: string
    name: string
    envelopeName: string
    consumed: number
    forecast: number
  }[]
}
```

---

# 6. Calculs métier

Les calculs utilisent les règles du **Financial Core**.

Rappels :

```
effectiveBudgetBase =
revisedAmount
+ REALLOCATION_DONE
```

```
remainingAmount =
effectiveBudgetBase
- committed
- consumed
```

Les valeurs utilisées :

```
committed
consumed
forecast
```

proviennent :

```
FinancialAllocation
FinancialEvent
```

---

# 7. KPI principaux

Calculs globaux :

### totalBudget

Somme :

```
BudgetLine.revisedAmount
```

---

### committed

Somme :

```
FinancialAllocation
allocationType = COMMITTED
```

---

### consumed

Somme :

```
allocationType = CONSUMED
```

---

### forecast

Somme :

```
allocationType = FORECAST
```

---

### remaining

```
totalBudget - committed - consumed
```

---

### consumptionRate

```
consumed / totalBudget
```

---

# 8. Distribution CAPEX / OPEX

Groupement :

```
BudgetLine.expenseType
```

Retour :

```
CAPEX total
OPEX total
```

---

# 9. Enveloppes à risque

Détection simple :

```
riskRatio = forecast / totalBudget
```

Niveaux :

```
< 70%   → LOW
70-90%  → MEDIUM
> 90%   → HIGH
```

---

# 10. Évolution mensuelle

Calcul basé sur :

```
FinancialEvent.createdAt
```

Agrégation :

```
SUM(consumed)
SUM(committed)
GROUP BY month
```

---

# 11. Performance

Contraintes :

* aucune requête par ligne
* agrégations SQL / Prisma
* pagination si nécessaire

Stratégies :

```
GROUP BY
SUM
COUNT
```

Limiter les datasets :

```
topEnvelopes → 10
topBudgetLines → 10
```

---

# 12. Types TypeScript

Fichier :

```
budget-dashboard.types.ts
```

Types principaux :

```
BudgetDashboardResponse
BudgetDashboardKpis
BudgetDashboardEnvelope
BudgetDashboardLine
BudgetDashboardMonthlyTrend
```

---

# 13. Intégration frontend

Le frontend Next.js consommera :

```
GET /api/budget-dashboard
```

pour construire le **cockpit financier**.

Vue cible :

```
Finance > Budgets > Dashboard
```

Composants frontend :

```
BudgetKpiCards
BudgetTrendChart
BudgetCapexOpexChart
BudgetEnvelopeTable
BudgetRiskTable
BudgetTopLinesTable
```

---

# 14. Audit logs

Lecture uniquement.

Aucun audit nécessaire.

---

# 15. Contraintes MVP

Inclus :

✔ KPI globaux
✔ distribution CAPEX / OPEX
✔ enveloppes principales
✔ enveloppes à risque
✔ évolution mensuelle

Exclus :

* BI avancée
* prédiction
* machine learning
* multi-budgets comparatifs

---

# 16. Critères de succès

La RFC est validée lorsque :

* endpoint `/api/budget-dashboard` fonctionnel
* agrégations correctes
* réponse < 500ms
* dashboard frontend opérationnel

---

# Résultat attendu

Cette RFC transforme le module budget en **véritable cockpit de pilotage financier**, cohérent avec la vision Starium Orchestra : un **SI de gouvernance et de pilotage décisionnel**.

---