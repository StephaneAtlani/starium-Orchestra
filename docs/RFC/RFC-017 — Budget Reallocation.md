# RFC-017 — Budget Reallocation

## Statut

Draft

## Objectif

Permettre le **transfert budgétaire entre lignes budgétaires** d’un même budget.

La fonctionnalité permet à un utilisateur autorisé de :

* transférer un montant d’une **BudgetLine source**
* vers une **BudgetLine cible**

afin d’ajuster la répartition budgétaire sans modifier la structure du budget.

Cette opération doit :

* être **traçable**
* être **réversible via l’historique**
* mettre à jour les **montants financiers calculés**

---

# Contexte

Dans la pratique, les budgets évoluent durant l’année :

exemples :

* réallocation d’un budget projet
* transfert RUN → BUILD
* transfert entre applications
* arbitrage financier en comité IT

Aujourd’hui ces ajustements sont souvent réalisés :

* dans Excel
* via modification manuelle des lignes

ce qui rend le suivi difficile.

La fonctionnalité **Budget Reallocation** permet de gérer ces ajustements de manière **structurée et auditée**.

---

# Périmètre fonctionnel

## Inclus

* transfert entre **deux BudgetLine**
* génération d’un **FinancialEvent**
* historisation de la réallocation
* recalcul automatique des montants

## Hors périmètre MVP

* workflow d’approbation
* réallocation multi-lignes
* réallocation inter-budget
* réallocation inter-exercice

---

# Règles métier

### 1 — Même budget

La ligne source et la ligne cible doivent appartenir au **même budget**.

```
source.budgetId == target.budgetId
```

---

### 2 — Même client

Toutes les lignes doivent appartenir au **client actif**.

---

### 3 — Montant disponible

Le montant transféré ne peut pas dépasser :

```
source.remainingAmount
```

---

### 4 — Montant strictement positif

```
amount > 0
```

---

### 5 — Lignes actives

Les deux lignes doivent être :

```
status = ACTIVE
```

---

### 6 — Pas de transfert vers soi-même

```
sourceLineId ≠ targetLineId
```

---

# Modèle de données

## Nouveau modèle Prisma

```
BudgetReallocation
```

### Champs

```
id
clientId
budgetId

sourceLineId
targetLineId

amount
currency

reason
createdBy

createdAt
```

---

### Relations

```
sourceLine   BudgetLine
targetLine   BudgetLine
```

---

### Index

```
@@index([clientId])
@@index([budgetId])
@@index([sourceLineId])
@@index([targetLineId])
@@index([createdAt])
```

---

# Logique métier

La réallocation produit **deux événements financiers**.

### Source

```
FinancialEvent
type = REALLOCATED
amount = -amount
budgetLineId = sourceLine
```

---

### Cible

```
FinancialEvent
type = REALLOCATED
amount = +amount
budgetLineId = targetLine
```

---

### Recalcul

Le module **financial-core** est ensuite déclenché pour recalculer :

```
forecastAmount
committedAmount
consumedAmount
remainingAmount
```

sur les deux lignes.

---

# API

## Endpoint

```
POST /api/budget-reallocations
```

---

## Guards

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

---

## Permission requise

```
budgets.update
```

---

## Body

```
{
  "sourceLineId": "uuid",
  "targetLineId": "uuid",
  "amount": 5000,
  "reason": "Arbitrage comité IT"
}
```

---

## Réponse

```
{
  "id": "reallocation_id",
  "sourceLineId": "...",
  "targetLineId": "...",
  "amount": 5000,
  "currency": "EUR",
  "createdAt": "2026-01-10T10:00:00Z"
}
```

---

# Autres endpoints

## Liste des réallocations

```
GET /api/budget-reallocations
```

Filtres possibles :

```
budgetId
budgetLineId
dateFrom
dateTo
```

---

## Détail

```
GET /api/budget-reallocations/:id
```

---

# Audit log

Chaque réallocation génère un audit log.

```
action: budget.reallocated
resourceType: BudgetLine
```

Payload :

```
{
  sourceLineId
  targetLineId
  amount
}
```

---

# Structure du module

```
budget-reallocation/
│
├ budget-reallocation.module.ts
├ budget-reallocation.controller.ts
├ budget-reallocation.service.ts
│
├ dto/
│ ├ create-reallocation.dto.ts
│ └ list-reallocation.query.dto.ts
│
└ types/
  └ reallocation.types.ts
```

---

# Séquence d'exécution

```
Controller
   ↓
Validation DTO
   ↓
Service
   ↓
Vérification règles métier
   ↓
Transaction Prisma
      ↓
   create BudgetReallocation
   create FinancialEvent source
   create FinancialEvent target
   ↓
Recalcul financial-core
   ↓
Audit log
```

---

# Exemple concret

Budget IT 2026

```
BL-001 Cloud AWS           50k
BL-002 ERP maintenance     30k
```

Réallocation :

```
5k de BL-002 → BL-001
```

Résultat :

```
Cloud AWS           55k
ERP maintenance     25k
```

---

# Impact technique

### Prisma

Migration ajout :

```
BudgetReallocation
```

---

### Backend

Nouveau module :

```
budget-reallocation
```

---

### Frontend (plus tard)

UI :

```
BudgetLine
 → bouton "Réallouer"
 → sélection ligne cible
 → montant
 → motif
```

---

# Sécurité

Les validations suivantes sont obligatoires :

* scope client
* permissions
* budget identique
* ligne active
* montant disponible

---

# Performance

Les opérations doivent être exécutées dans **une transaction Prisma unique**.

```
prisma.$transaction()
```

---

# Tests

Tests à couvrir :

* transfert valide
* transfert > remainingAmount
* transfert vers même ligne
* lignes budgets différents
* lignes client différent

---

# Dépendances

RFC nécessaires :

```
RFC-015-2 Budget Management
RFC-015-1B Financial Core
RFC-016 Budget Reporting API
```

---

# RFC suivantes liées

```
RFC-018 Budget Import / Export
RFC-019 Budget Versioning
RFC-020 Budget Workflow
RFC-021 Analytical Dimensions
```
