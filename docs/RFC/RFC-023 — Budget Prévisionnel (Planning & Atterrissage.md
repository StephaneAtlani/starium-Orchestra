# **RFC-023 — Budget Prévisionnel (Planning & Atterrissage)**

## Statut

Draft

## Priorité

Haute

## Dépendances

* RFC-015-1B — Financial Core Backend 
* RFC-015-2 — Budget Management Backend 
* RFC-016 — Budget Reporting API
* RFC-013 — Audit Logs

---

# 1. Objectif

Mettre en place un **moteur de budget prévisionnel** permettant :

* de répartir une `BudgetLine` dans le temps (mensualisation)
* de calculer un **atterrissage budgétaire**
* de détecter les dérives avant clôture
* de fournir une expérience **type Excel + calculatrice**

---

# 2. Principe métier

## 2.1 Niveau de vérité

* **Saisie = BudgetLine**
* **Agrégation = BudgetEnvelope / Budget / Exercise**

👉 Le prévisionnel est **attaché à la ligne budgétaire**, jamais à l’enveloppe.

---

## 2.2 Rôle du prévisionnel

Le prévisionnel permet de déterminer :

```text
Atterrissage = Consommé + Engagé + Prévision restant
```

---

## 2.3 Position dans l’architecture

Hiérarchie existante :

```
BudgetExercise
  → Budget
    → BudgetEnvelope
      → BudgetLine
```

Extension :

```
BudgetLine
  → BudgetLinePlanning
      → BudgetLinePlanningMonth (x12)
```

---

# 3. Périmètre MVP

## Inclus

* planning mensuel (12 mois)
* saisie manuelle
* modes de calcul simples
* recalcul backend
* atterrissage
* écarts
* vue Excel-like
* audit logs

## Exclus

* snapshots
* workflow de validation
* multi-scénarios
* IA
* dépendances entre lignes

---

# 4. Concepts métier

## 4.1 BudgetLinePlanning

Représente le prévisionnel d’une ligne.

### Champs

```prisma
model BudgetLinePlanning {
  id                  String   @id @default(cuid())
  clientId            String
  budgetLineId        String

  planningMode        BudgetPlanningMode
  planningTotalAmount Decimal  @db.Decimal(18,2)

  notes               String?

  lastCalculatedAt    DateTime?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  client              Client
  budgetLine          BudgetLine

  months              BudgetLinePlanningMonth[]

  @@unique([budgetLineId])
  @@index([clientId])
}
```

---

## 4.2 BudgetLinePlanningMonth

```prisma
model BudgetLinePlanningMonth {
  id                     String   @id @default(cuid())
  clientId               String
  budgetLinePlanningId   String

  year                   Int
  month                  Int

  plannedAmount          Decimal  @db.Decimal(18,2)

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  client                 Client
  planning               BudgetLinePlanning

  @@unique([budgetLinePlanningId, year, month])
  @@index([clientId])
}
```

---

## 4.3 Enum

```prisma
enum BudgetPlanningMode {
  MANUAL
  ANNUAL_SPREAD
  ONE_SHOT
}
```

---

# 5. Règles métier

## 5.1 Une ligne = un planning

```text
1 BudgetLine = 1 BudgetLinePlanning
```

---

## 5.2 12 mois obligatoires

* toujours 12 mois
* jamais de trou

---

## 5.3 Cohérence client

Toutes les entités doivent partager le même `clientId`.

---

## 5.4 Recalcul obligatoire

À chaque modification :

* recalcul du planning total
* recalcul du forecastAmount
* recalcul de l’atterrissage

---

## 5.5 Backend source de vérité

* aucun calcul métier en frontend
* frontend = affichage uniquement

---

# 6. Logique de calcul

## 6.1 Total prévisionnel

```text
planningTotalAmount = SUM(months)
```

---

## 6.2 Atterrissage

```text
landing =
consumedAmount
+ committedAmount
+ remainingPlanning
```

---

## 6.3 Écart

```text
variance = landing - revisedAmount
```

---

# 7. Modes de calcul

## 7.1 MANUAL

* saisie libre sur 12 mois

---

## 7.2 ANNUAL_SPREAD

```text
monthly = total / 12
```

---

## 7.3 ONE_SHOT

```text
un seul mois = total
les autres = 0
```

---

# 8. API

## 8.1 GET planning

```http
GET /api/budget-lines/:id/planning
```

### Réponse

```json
{
  "mode": "ANNUAL_SPREAD",
  "months": [
    { "month": 1, "amount": 2200 },
    ...
  ],
  "total": 26400,
  "landing": 26400,
  "variance": 0
}
```

---

## 8.2 PATCH manuel

```http
PATCH /api/budget-lines/:id/planning
```

```json
{
  "monthlyValues": [2200, 2200, ...]
}
```

---

## 8.3 Apply mode

```http
POST /api/budget-lines/:id/planning/apply-mode
```

```json
{
  "mode": "ONE_SHOT",
  "parameters": {
    "month": 3,
    "amount": 18000
  }
}
```

---

# 9. Audit logs

Action :

```text
budget_line.planning.updated
```

Payload :

```json
{
  "budgetLineId": "...",
  "oldValues": {...},
  "newValues": {...}
}
```

---

# 10. UX

## 10.1 Vue Prévisionnel

* grille type Excel
* 12 mois
* édition cellule
* scroll horizontal

---

## 10.2 Calculatrice

Drawer :

* choix du mode
* paramètres
* preview
* appliquer

---

## 10.3 Vue Atterrissage

* budget
* consommé
* engagé
* atterrissage
* écart
* alertes

---

# 11. Sécurité

Guards standards :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permissions :

```
budgets.read
budgets.update
```

---

# 12. Performance

* batch update à prévoir
* debounce frontend
* recalcul transactionnel

---

# 13. Roadmap

## V1 (MVP)

* planning mensuel
* 3 modes
* UI Excel
* atterrissage

## V2

* quarterly spread
* growth
* duplication année

## V3

* snapshots
* multi-scénarios

---

# 14. Résumé

> Le budget prévisionnel est une projection mensuelle par ligne budgétaire, pilotée par le backend, permettant de calculer l’atterrissage et d’anticiper les dérives.
