# RFC-PROJ-012 — Project Sheet (Fiche projet décisionnelle)

## Statut

**Partiellement implémenté** — priorité produit maintenue.

**Réalisé dans le repo** : module `apps/api/src/modules/projects/project-sheet/` (`ProjectSheetController`, `ProjectSheetService`, DTO `UpdateProjectSheetDto`) ; schéma Prisma `Project` étendu (cadrage, SWOT/TOWS, arbitrage à trois niveaux + champs optionnels de motif si statut `REFUSE`, etc.) ; UI fiche sur le détail projet (`ProjectSheetView`) avec autosave, édition **type** et **statut** cycle de vie (`ProjectType` / `ProjectStatus`) sous `projects.update`. Données strictement scopées `clientId` via guards existants.

**Encore couvert par la vision RFC mais non exhaustivement dans ce fichier** : métriques portefeuille agrégées, règles de décision « APPROVED / ON_HOLD » au-delà du modèle arbitrage actuel, page dédiée `/projects/[id]/sheet` isolée (la fiche est intégrée au détail projet).

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

**Note** : le bloc ci-dessus est la **vision initiale** de la RFC. Le schéma effectif et les champs à jour sont dans `apps/api/prisma/schema.prisma` (modèle `Project` : entre autres `targetEndDate`, `arbitrationMetierStatus` / `arbitrationComiteStatus` / `arbitrationCodirStatus`, notes de refus, `copilRecommendation`, champs cadrage, SWOT/TOWS, etc.).

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

### Champ legacy `Project.arbitrationStatus`

| Statut    | Signification |
| --------- | ------------- |
| DRAFT     | en cours      |
| TO_REVIEW | prêt CODIR    |
| VALIDATED | validé        |
| REJECTED  | refusé        |

### Arbitrage à trois niveaux (implémenté)

Chaque niveau (métier → comité → sponsor / CODIR) a un statut `ProjectArbitrationLevelStatus` (`BROUILLON`, `EN_COURS`, `VALIDE`, `REFUSE`). Le niveau suivant n’est éditable qu’après validation du précédent. En cas de `REFUSE`, des champs texte optionnels **motif du refus** (un par niveau concerné) peuvent être renseignés ; ils sont effacés côté serveur si le statut du niveau n’est plus `REFUSE`.

`PATCH /api/projects/:id/project-sheet` met à jour ces niveaux et dérive `arbitrationStatus` pour rétrocompatibilité / exports.

---

## 6.4 Cohérence client

* projet appartient à `clientId`
* toutes les données liées doivent respecter le scope multi-tenant 

---

# 7. API

**Préfixe global** : `/api`. **Isolation** : toutes les routes ci-dessous passent par `ActiveClientGuard` ; le projet doit appartenir au client actif.

| Méthode | Route | Permission |
|--------|--------|------------|
| GET | `/projects/:id/project-sheet` | `projects.read` |
| PATCH | `/projects/:id/project-sheet` | `projects.update` |
| POST | `/projects/:id/arbitration` | `projects.update` |

## 7.1 Update fiche projet

```
PATCH /api/projects/:id/project-sheet
```

Body (champs **tous optionnels** ; liste indicative — voir `UpdateProjectSheetDto`) :

* identité / cadrage : `name`, `description`, `cadreLocation`, `cadreQui`, `involvedTeams`, `startDate`, `targetEndDate`
* **cycle de vie** : `type` (`ProjectType`), `status` (`ProjectStatus`)
* portefeuille : `priority`, `criticality`
* scores & financier : `businessValueScore`, `strategicAlignment`, `urgencyScore`, `estimatedCost`, `estimatedGain`, `riskLevel`, `riskResponse`
* COPIL : `copilRecommendation`
* arbitrage multi-niveaux : `arbitrationMetierStatus`, `arbitrationComiteStatus`, `arbitrationCodirStatus`, et si refus : `arbitrationMetierRefusalNote`, `arbitrationComiteRefusalNote`, `arbitrationCodirRefusalNote`
* cadrage métier / SWOT-TOWS : `businessProblem`, `businessBenefits`, `businessSuccessKpis`, `swotStrengths`, …, `towsActions`

Le serveur recalcule **ROI** et **priorityScore** selon les règles du service (risque effectif, etc.).

```json
{
  "businessValueScore": 4,
  "strategicAlignment": 5,
  "urgencyScore": 3,
  "estimatedCost": 50000,
  "estimatedGain": 120000,
  "riskLevel": "MEDIUM",
  "type": "TRANSFORMATION",
  "status": "IN_PROGRESS",
  "arbitrationMetierStatus": "VALIDE",
  "arbitrationMetierRefusalNote": null
}
```

---

## 7.2 Get fiche projet

```
GET /api/projects/:id/project-sheet
```

Retour (extrait — la réponse inclut l’ensemble des champs fiche, dont `kind`, `type`, `status`, `code`, arbitrage multi-niveaux, notes de refus, SWOT/TOWS, etc.) :

```json
{
  "id": "proj_123",
  "name": "Migration ERP",
  "type": "TRANSFORMATION",
  "status": "IN_PROGRESS",

  "businessValueScore": 4,
  "strategicAlignment": 5,
  "urgencyScore": 3,

  "estimatedCost": 50000,
  "estimatedGain": 120000,

  "roi": 1.4,
  "riskLevel": "MEDIUM",

  "priorityScore": 6.2,
  "arbitrationStatus": "TO_REVIEW",
  "arbitrationMetierStatus": "VALIDE",
  "arbitrationComiteStatus": null,
  "arbitrationCodirStatus": null
}
```

---

## 7.3 Changer statut arbitrage (legacy)

```
POST /api/projects/:id/arbitration
```

Met à jour **`Project.arbitrationStatus`** (flux legacy distinct du PATCH fiche). Body :

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

**Implémenté** : la fiche est intégrée au **détail projet** (`/projects/[projectId]`), composant `ProjectSheetView`, avec autosave sur les champs (dont type, statut, arbitrage, motifs de refus).

**Piste optionnelle** : route dédiée `/projects/[id]/sheet` si l’on veut une page plein écran plus tard.

Contenu visé :

* scorecards
* ROI
* coût vs gain
* niveau de risque
* score global
* arbitrage multi-niveaux

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

