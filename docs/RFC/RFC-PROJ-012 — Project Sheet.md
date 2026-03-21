# RFC-PROJ-012 — Project Sheet (Fiche projet décisionnelle)

## Statut

Draft — **priorité critique produit**

---

# 1. Objectif

Introduire une **fiche projet décisionnelle** permettant au CODIR / DSI / DAF d’arbitrer un projet en se basant sur :

* valeur métier
* coût global
* ROI
* risques
* priorité

Cette fiche constitue une **couche d’arbitrage stratégique**, complémentaire au suivi opérationnel (tâches, planning).

👉 Aligné avec la vision cockpit : permettre une **prise de décision rapide et éclairée** 

---

# 2. Problème résolu

Aujourd’hui :

* les projets existent (tasks, risques, planning)
* les budgets existent (lignes, allocations)

❌ MAIS :

* aucune vision consolidée **valeur vs coût**
* aucun outil pour arbitrer entre projets
* aucune priorisation structurée

👉 Résultat :

* décisions subjectives
* manque de cohérence portefeuille
* difficulté CODIR

---

# 3. Positionnement

La Project Sheet est :

> une **vue décisionnelle transverse** entre module Projets + Budget + Gouvernance

Elle n’est pas :

* un outil de gestion de tâches
* un outil de suivi technique

👉 C’est un **outil d’arbitrage stratégique**

---

# 4. Périmètre MVP

## Inclus

* fiche projet enrichie
* scoring valeur
* estimation coûts
* calcul ROI simple
* scoring risque
* score de priorité global
* statut d’arbitrage

## Exclus

* workflow de validation complexe
* simulation financière avancée
* IA prédictive (plus tard)

---

# 5. Modèle de données

## 5.1 Extension `Project`

```prisma
model Project {
  id          String @id @default(cuid())
  clientId    String

  name        String
  description String?

  // EXISTANT
  status      ProjectStatus
  startDate   DateTime?
  endDate     DateTime?

  // 🔥 NOUVEAU — FICHE PROJET

  businessValueScore   Int?     // 1-5
  strategicAlignment   Int?     // 1-5
  urgencyScore         Int?     // 1-5

  estimatedCost        Decimal? @db.Decimal(18,2)
  estimatedGain        Decimal? @db.Decimal(18,2)

  roi                  Decimal? @db.Decimal(10,2)

  riskLevel            ProjectRiskLevel? // LOW / MEDIUM / HIGH

  priorityScore        Decimal? @db.Decimal(5,2)

  arbitrationStatus    ProjectArbitrationStatus? // DRAFT / TO_REVIEW / VALIDATED / REJECTED

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clientId])
}
```

---

## 5.2 Enums

```prisma
enum ProjectRiskLevel {
  LOW
  MEDIUM
  HIGH
}

enum ProjectArbitrationStatus {
  DRAFT
  TO_REVIEW
  VALIDATED
  REJECTED
}
```

---

# 6. Règles métier

## 6.1 Calcul ROI

```text
ROI = (estimatedGain - estimatedCost) / estimatedCost
```

* si cost = 0 → ROI null
* stocké en base (pas recalculé à chaque lecture)

---

## 6.2 Calcul score priorité

Proposition MVP :

```text
priorityScore =
  (businessValueScore * 0.4)
+ (strategicAlignment * 0.3)
+ (urgencyScore * 0.2)
- (riskPenalty)
+ (roiFactor)
```

### Règles :

* `riskPenalty` :

  * LOW → 0
  * MEDIUM → -1
  * HIGH → -2

* `roiFactor` :

  * ROI > 1 → +2
  * ROI > 0 → +1
  * ROI < 0 → -2

👉 calcul backend uniquement (source de vérité) 

---

## 6.3 Statut d’arbitrage

| Statut    | Signification |
| --------- | ------------- |
| DRAFT     | en cours      |
| TO_REVIEW | prêt CODIR    |
| VALIDATED | validé        |
| REJECTED  | refusé        |

---

## 6.4 Cohérence client

* projet appartient à `clientId`
* toutes les données liées doivent respecter le scope multi-tenant 

---

# 7. API

## 7.1 Update fiche projet

```
PATCH /api/projects/:id/project-sheet
```

Body :

```json
{
  "businessValueScore": 4,
  "strategicAlignment": 5,
  "urgencyScore": 3,
  "estimatedCost": 50000,
  "estimatedGain": 120000,
  "riskLevel": "MEDIUM"
}
```

---

## 7.2 Get fiche projet

```
GET /api/projects/:id/project-sheet
```

Retour :

```json
{
  "id": "proj_123",
  "name": "Migration ERP",

  "businessValueScore": 4,
  "strategicAlignment": 5,
  "urgencyScore": 3,

  "estimatedCost": 50000,
  "estimatedGain": 120000,

  "roi": 1.4,
  "riskLevel": "MEDIUM",

  "priorityScore": 6.2,
  "arbitrationStatus": "TO_REVIEW"
}
```

---

## 7.3 Changer statut arbitrage

```
POST /api/projects/:id/arbitration
```

Body :

```json
{
  "status": "VALIDATED"
}
```

---

# 8. Architecture backend

Module :

```
apps/api/src/modules/projects/project-sheet/
```

Structure :

```
project-sheet
 ├ project-sheet.controller.ts
 ├ project-sheet.service.ts
 ├ dto
 └ calculators
```

---

## 8.1 Service

Responsabilités :

* calcul ROI
* calcul priorité
* validation règles métier
* mise à jour projet

---

## 8.2 Audit log

Actions :

```
project.sheet.updated
project.arbitration.validated
project.arbitration.rejected
```

👉 conforme système audit 

---

# 9. Intégration avec Budget

⚠️ clé stratégique

Deux options :

### MVP (rapide)

* champ `estimatedCost` manuel

### V2 (recommandé)

* calcul basé sur :

  * BudgetLine liées au projet
  * allocations financières

👉 cohérent avec financial-core

---

# 10. Impact frontend

Nouvelle page :

```
/projects/[id]/sheet
```

Contenu :

* scorecards
* ROI
* coût vs gain
* niveau de risque
* score global
* bouton validation

Objectif :

> décision en < 2 minutes

---

# 11. KPI cockpit

Permet ensuite :

* top projets prioritaires
* projets à faible ROI
* projets à risque élevé
* portefeuille global

👉 alimente cockpit global 

---

# 12. Critères de succès

* un projet peut être arbitré en < 2 min
* score automatique fiable
* cohérence multi-client respectée
* aucune logique métier en frontend

