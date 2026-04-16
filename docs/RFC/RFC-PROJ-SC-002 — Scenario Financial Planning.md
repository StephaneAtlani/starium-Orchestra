# RFC-PROJ-SC-002 — Scenario Financial Planning

## Statut

🟡 Partiel (backend MVP) — pas de cockpit UI ; la RFC reste la référence fonctionnelle.

## Priorité

Très haute

## Dépendances

- `RFC-PROJ-SC-001` — socle scénario
- `RFC-PROJ-010` — liens projet ↔ budget
- `RFC-015-1B` / `RFC-015-2` / `RFC-016` — financial core, budgets, reporting
- `RFC-023` / `RFC-024` — planning budgétaire

---

# 1. Objectif

Permettre à un scénario projet de porter une **projection financière détaillée** sans dupliquer le core budget :

- montant planifié par poste
- ventilation par `BudgetLine`
- hypothèses de répartition dans le temps
- comparaison avec baseline et réel

---

# 2. Principe d’architecture

Le scénario **référence** les objets financiers existants. Il ne recrée pas de moteur budgétaire parallèle.

Règles :

- pas de duplication de `Budget`, `BudgetEnvelope`, `BudgetLine`
- un scénario ajoute une couche de **projection**
- les calculs de consolidation restent alignés avec le financial core

---

# 3. Périmètre

## Inclus

- projection de coûts par scénario
- lignes de projection liées aux `ProjectBudgetLink`
- ventilation temporelle optionnelle
- KPI de comparaison `planned / forecast / actual`

## Exclus

- écriture directe dans les montants budgétaires officiels
- génération automatique de `FinancialEvent`
- workflow budgétaire

---

# 4. Modèle de données

```prisma
model ProjectScenarioFinancialLine {
  id                  String   @id @default(cuid())
  clientId            String
  scenarioId          String
  projectBudgetLinkId String?
  budgetLineId        String?

  label               String
  costCategory        String?
  amountPlanned       Decimal  @db.Decimal(18,2)
  amountForecast      Decimal? @db.Decimal(18,2)
  amountActual        Decimal? @db.Decimal(18,2)
  currencyCode        String?  @db.VarChar(3)
  startDate           DateTime?
  endDate             DateTime?
  notes               String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  client            Client             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  scenario          ProjectScenario    @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  projectBudgetLink ProjectBudgetLink? @relation(fields: [projectBudgetLinkId], references: [id], onDelete: SetNull)
  budgetLine        BudgetLine?        @relation(fields: [budgetLineId], references: [id], onDelete: SetNull)

  @@index([clientId, scenarioId])
  @@index([clientId, budgetLineId])
  @@index([clientId, projectBudgetLinkId])
}
```

**Implémentation dépôt (alignée)** : `apps/api/prisma/schema.prisma` ; migration `apps/api/prisma/migrations/20260420120000_project_scenario_financial_lines/migration.sql`.

---

# 5. Règles métier

- une ligne financière appartient à un seul scénario
- `budgetLineId`, si renseigné, doit appartenir au même `clientId`
- `projectBudgetLinkId`, si renseigné, doit appartenir au même `clientId`, au même `projectId` que le scénario, et pointer vers une `ProjectBudgetLink` existante
- si `projectBudgetLinkId` **et** `budgetLineId` sont tous deux renseignés, ils doivent désigner **la même** ligne budgétaire (cohérence avec le lien projet)
- `amountPlanned >= 0` ; `amountForecast` et `amountActual`, s’ils sont fournis, sont `>= 0`
- `startDate <= endDate` lorsque les deux dates sont présentes
- la somme des projections scénario ne modifie jamais le budget officiel sans validation métier explicite hors périmètre
- les montants exposés en UI doivent toujours afficher un libellé métier de `BudgetLine`, jamais l’ID
- **Suppression / intégrité** : suppression d’un `ProjectScenario` supprime en cascade ses lignes financières ; suppression d’un `ProjectBudgetLink` ou d’une `BudgetLine` met à `null` les FK correspondantes sur la ligne scénario (`onDelete: SetNull`) — les montants projetés restent consultables sans baseline exploitable

---

# 6. API backend

```http
GET    /api/projects/:projectId/scenarios/:scenarioId/financial-lines
POST   /api/projects/:projectId/scenarios/:scenarioId/financial-lines
PATCH  /api/projects/:projectId/scenarios/:scenarioId/financial-lines/:lineId
DELETE /api/projects/:projectId/scenarios/:scenarioId/financial-lines/:lineId
GET    /api/projects/:projectId/scenarios/:scenarioId/financial-summary
```

Permissions :

- `GET` (liste, synthèse, détail scénario incluant `budgetSummary`) : **`projects.read`**
- `POST` / `PATCH` / `DELETE` (lignes financières) : **`projects.update`**

**Note RBAC** : comme pour `RFC-PROJ-010` (`project-budget-links.controller.ts`), les routes scénario sous `/api/projects/...` n’emploient **que** le préfixe `projects.*` — l’accès aux tables budget se fait en lecture interne côté service, sans exposer `budgets.*` sur la même route.

**Contrats de réponse**

- `GET .../financial-lines` : `{ items, total, limit, offset }` ; tri par défaut **`createdAt` desc** ; chaque item inclut obligatoirement les objets enrichis :
  - `budgetLine: { id, code, name } | null`
  - `projectBudgetLink: { id, allocationType, percentage, amount, budgetLine: { id, code, name } } | null`
- `POST` / `PATCH` : une ligne `ProjectScenarioFinancialLine` (même forme enrichie que la liste)
- `DELETE` : **`204 No Content`**
- `GET .../financial-summary` : objet synthèse (voir §7)

**Injection `budgetSummary` dans le détail scénario** : `GET /api/projects/:projectId/scenarios/:scenarioId` inclut désormais `budgetSummary` (même shape que `financial-summary`). La liste `GET /api/projects/:projectId/scenarios` conserve `budgetSummary: null` pour éviter un coût d’agrégation non paginé.

**Audits (mutations uniquement)** : `project.scenario_financial_line.created`, `project.scenario_financial_line.updated`, `project.scenario_financial_line.deleted`. Aucun audit sur `GET .../financial-summary` ni sur la liste des lignes.

**Code** : `apps/api/src/modules/project-scenarios/project-scenario-financial-lines.controller.ts`, `project-scenario-financial-lines.service.ts`, DTOs `dto/create|update|list-project-scenario-financial-line*.dto.ts`.

---

# 7. Résumé et KPI

Le résumé API doit fournir :

- `plannedTotal`
- `forecastTotal`
- `actualTotal`
- `varianceVsBaseline`
- `varianceVsActual`
- `budgetCoverageRate`

**Définitions implémentées (agrégation par scénario, lecture seule sur le core budget)**

- `plannedTotal` = somme des `amountPlanned` des lignes du scénario
- `forecastTotal` = somme des `amountForecast` avec règle **`amountForecast ?? amountPlanned`** par ligne
- `actualTotal` = somme des `amountActual` en traitant `null` comme **0**
- **Baseline par ligne** (priorité stricte, lecture seule) :
  1. si `projectBudgetLinkId` présent : baseline dérivée du lien — `FULL` ⇒ `initialAmount` de la ligne budgétaire liée ; `PERCENTAGE` ⇒ `initialAmount * percentage / 100` (arrondi 2 décimales) ; `FIXED` ⇒ montant `amount` du lien (arrondi 2 décimales)
  2. sinon si `budgetLineId` présent (ou dérivable du lien) : baseline = `initialAmount` de la `BudgetLine`
  3. sinon : pas de baseline exploitable pour cette ligne
- `baselineTotal` = somme des baselines exploitables par ligne
- `varianceVsBaseline` = `plannedTotal - baselineTotal` si `baselineTotal > 0`, sinon **`null`**
- `varianceVsActual` = `plannedTotal - actualTotal`
- `budgetCoverageRate` = `plannedTotal / baselineTotal` si `baselineTotal > 0`, sinon **`null`** (nombre décimal, 4 décimales en interne)

---

# 8. Tests

- refus d’associer une `BudgetLine` d’un autre client
- refus d’associer un `ProjectBudgetLink` hors scope projet / client
- refus de combinaison incohérente `projectBudgetLinkId` + `budgetLineId`
- calcul des totaux d’un scénario
- comparaison baseline vs scénario
- suppression d’une ligne financière sans casser les agrégats
- couverture `budgetCoverageRate` (cas nominal + absence de baseline)
- permissions `projects.read` / `projects.update` sur les routes dédiées
- réponse enrichie : jamais d’IDs seuls sans `budgetLine` / `projectBudgetLink` structurés

**Code** : `apps/api/src/modules/project-scenarios/project-scenario-financial-lines.service.spec.ts`, `project-scenario-financial-lines.controller.spec.ts`, ajustements `project-scenarios.*.spec.ts`.

---

# 9. Plan d’implémentation

1. Ajouter `ProjectScenarioFinancialLine`.
2. Brancher les liens sur `ProjectBudgetLink` quand disponibles.
3. Exposer API CRUD.
4. Ajouter endpoint `financial-summary`.
5. Raccorder la synthèse au cockpit scénario.

---

# 10. Points de vigilance

- ne pas créer de “mini budget engine” concurrent
- aligner les définitions de montants avec le budget existant
- prévoir les comparaisons baseline / réel dès les DTOs
