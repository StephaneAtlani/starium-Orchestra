# RFC-PROJ-SC-002 — Scenario Financial Planning

## Statut

📝 Draft

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

  @@index([clientId, scenarioId])
  @@index([clientId, budgetLineId])
}
```

---

# 5. Règles métier

- une ligne financière appartient à un seul scénario
- `budgetLineId`, si renseigné, doit appartenir au même `clientId`
- `amountPlanned >= 0`
- la somme des projections scénario ne modifie jamais le budget officiel sans validation métier explicite hors périmètre
- les montants exposés en UI doivent toujours afficher un libellé métier de `BudgetLine`, jamais l’ID

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

- `projects.read`
- `projects.update`

---

# 7. Résumé et KPI

Le résumé API doit fournir :

- `plannedTotal`
- `forecastTotal`
- `actualTotal`
- `varianceVsBaseline`
- `varianceVsActual`
- `budgetCoverageRate`

---

# 8. Tests

- refus d’associer une `BudgetLine` d’un autre client
- calcul des totaux d’un scénario
- comparaison baseline vs scénario
- suppression d’une ligne financière sans casser les agrégats

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
