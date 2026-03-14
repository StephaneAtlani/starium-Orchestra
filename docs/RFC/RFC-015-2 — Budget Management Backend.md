# RFC-015-2 — Budget Management Backend

## Statut

Implémenté

## Dépendances

* RFC-002 — Authentification utilisateur
* RFC-003 — Multi-client / client actif
* RFC-011 — Modules et activation par client
* RFC-012 — Permissions backend
* RFC-013 — Audit logs
* RFC-015-1A — Prisma Schema Financial Core
* RFC-015-1B — Financial Core Backend

---

# 1. Objectif

Implémenter le **backend de gestion de la structure budgétaire** du module Budget.

Cette RFC introduit les **conteneurs budgétaires** nécessaires au moteur financier :

* `BudgetExercise`
* `Budget`
* `BudgetEnvelope`
* `BudgetLine`

Ces objets permettent de structurer les budgets avant l'utilisation du **Financial Core** (allocations et événements).

---

# 2. Structure budgétaire cible

Hiérarchie métier :

```
BudgetExercise
    │
    ▼
Budget
    │
    ▼
BudgetEnvelope
    │
    ▼
BudgetLine
```

* un exercice contient plusieurs budgets
* un budget contient plusieurs enveloppes
* une enveloppe contient plusieurs lignes budgétaires

Les allocations et événements financiers seront attachés aux **BudgetLine** via RFC-015-1B.

---

# 3. Périmètre

## Inclus

* gestion des exercices budgétaires
* gestion des budgets
* gestion des enveloppes
* gestion des lignes budgétaires
* pagination
* filtrage
* audit logs
* validation multi-client
* permissions
* tests unitaires minimum

## Exclus

* allocations financières
* événements financiers
* dashboards
* import Excel
* duplication de budget
* workflow d'approbation
* suppression physique

---

# 4. Module backend

Créer :

```
apps/api/src/modules/budget-management/
```

Structure :

```
budget-management
│
├── budget-management.module.ts
│
├── budget-exercises
│   ├── budget-exercises.controller.ts
│   ├── budget-exercises.service.ts
│   └── dto
│
├── budgets
│   ├── budgets.controller.ts
│   ├── budgets.service.ts
│   └── dto
│
├── budget-envelopes
│   ├── budget-envelopes.controller.ts
│   ├── budget-envelopes.service.ts
│   └── dto
│
├── budget-lines
│   ├── budget-lines.controller.ts
│   ├── budget-lines.service.ts
│   └── dto
│
├── validators
│
└── tests
```

Enregistrer le module dans :

```
apps/api/src/app.module.ts
```

---

# 5. Guards

Toutes les routes utilisent :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Décorateurs :

```
@RequirePermissions()
@ActiveClientId()
@RequestUser()
@RequestMeta()
```

`clientId` ne doit **jamais apparaître dans les DTO**.

---

# 6. Permissions

Permissions utilisées :

```
budgets.read
budgets.create
budgets.update
```

| Action | Permission     |
| ------ | -------------- |
| GET    | budgets.read   |
| POST   | budgets.create |
| PATCH  | budgets.update |

---

# 7. Endpoints

## BudgetExercises

```
GET    /api/budget-exercises
POST   /api/budget-exercises
GET    /api/budget-exercises/:id
PATCH  /api/budget-exercises/:id
```

Filtres :

```
status
search
offset
limit
```

---

## Budgets

```
GET    /api/budgets
POST   /api/budgets
GET    /api/budgets/:id
PATCH  /api/budgets/:id
```

Filtres :

```
exerciseId
status
ownerUserId
search
offset
limit
```

---

## Budget Envelopes

```
GET    /api/budget-envelopes
POST   /api/budget-envelopes
GET    /api/budget-envelopes/:id
PATCH  /api/budget-envelopes/:id
```

Filtres :

```
budgetId
status
search
offset
limit
```

---

## Budget Lines

```
GET    /api/budget-lines
POST   /api/budget-lines
GET    /api/budget-lines/:id
PATCH  /api/budget-lines/:id
```

Filtres :

```
budgetId
envelopeId
status
expenseType
search
offset
limit
```

---

# 8. DTO principaux

## CreateBudgetExerciseDto

```
name
code?
startDate
endDate
status?
```

---

## CreateBudgetDto

```
exerciseId
name
code?
description?
currency
status?
ownerUserId?
```

---

## CreateBudgetEnvelopeDto

```
budgetId
name
code?
description?
status?
```

---

## CreateBudgetLineDto

```
budgetId
envelopeId
name
code?
description?
expenseType
initialAmount
revisedAmount?
currency
status?
```

---

# 9. Règles métier

## Appartenance client

Chaque ressource doit appartenir au `clientId` actif.

Vérifications obligatoires :

* exercice → client
* budget → exercice du client
* enveloppe → budget du client
* ligne → enveloppe du client

---

## Cohérence hiérarchique

Lors de la création d’une ligne :

* vérifier que `budgetId` existe
* vérifier que `envelopeId` existe
* vérifier que :

```
envelope.budgetId === budgetId
```

---

## Statuts

### BudgetExercise

```
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

---

### Budget

```
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

---

### BudgetEnvelope

```
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

---

### BudgetLine

```
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

---

# 10. Initialisation financière des lignes

Lors de la création d'une ligne :

```
revisedAmount = initialAmount si absent
forecastAmount = 0
committedAmount = 0
consumedAmount = 0
remainingAmount = revisedAmount
```

---

# 11. Mise à jour des lignes

Si `revisedAmount` change :

```
remainingAmount =
revisedAmount
- committedAmount
- consumedAmount
```

Ne jamais modifier :

```
forecastAmount
committedAmount
consumedAmount
```

Ces valeurs sont gérées par RFC-015-1B.

---

# 12. Pagination

Toutes les listes retournent :

```
{
  items: [],
  total: number,
  limit: number,
  offset: number
}
```

Defaults :

```
limit = 20
offset = 0
limit max = 100
```

---

# 13. Tri par défaut

| Objet          | Tri            |
| -------------- | -------------- |
| BudgetExercise | startDate desc |
| Budget         | createdAt desc |
| BudgetEnvelope | createdAt desc |
| BudgetLine     | createdAt desc |

---

# 14. Audit Logs

Créer un audit log pour chaque :

### création

```
budget_exercise.created
budget.created
budget_envelope.created
budget_line.created
```

### modification

```
budget_exercise.updated
budget.updated
budget_envelope.updated
budget_line.updated
```

---

# 15. Tests unitaires

Tester :

### BudgetExercise

* création valide
* erreur dates
* update interdit si archivé

### Budget

* exercice du bon client
* erreur exercice autre client

### BudgetEnvelope

* budget du bon client
* rejet si budget clos

### BudgetLine

* enveloppe et budget cohérents
* initialisation montants
* recalcul remainingAmount
* rejet si parent clos

---

# 16. Points de vigilance

* ne jamais exposer `clientId`
* vérifier l'appartenance client sur toutes les relations
* éviter dépendances circulaires
* ne pas modifier Prisma
* ne pas implémenter le Financial Core ici
* gérer correctement `Prisma.Decimal`

---

# 17. Architecture finale

```
BudgetExercise
     │
     ▼
Budget
     │
     ▼
BudgetEnvelope
     │
     ▼
BudgetLine
     │
     ├── FinancialAllocation
     └── FinancialEvent
            │
            ▼
 BudgetLineCalculatorService
```

---

# 18. Résultat attendu

Après cette RFC, un utilisateur peut :

1️⃣ créer un exercice
2️⃣ créer un budget
3️⃣ créer une enveloppe
4️⃣ créer des lignes budgétaires
5️⃣ utiliser ensuite le Financial Core pour les flux financiers

---
