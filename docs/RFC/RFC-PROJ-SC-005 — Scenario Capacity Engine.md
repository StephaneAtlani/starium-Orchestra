# RFC-PROJ-SC-005 — Scenario Capacity Engine

## Statut

Implemented (backend MVP)

## Priorité

Haute

## Dépendances

- `RFC-PROJ-SC-003`
- `RFC-TEAM-009` — temps réalisé
- `RFC-RES-001` — référentiel ressources

---

# 1. Objectif

Calculer l’écart **charge projetée vs capacité disponible** afin de détecter :

- surcharge
- sous-charge
- conflits de staffing
- faisabilité réelle d’un scénario

---

# 2. Périmètre

## Inclus

- calcul de capacité théorique par ressource
- comparaison avec la charge scénario
- alertes surcharge / sous-charge
- synthèse par période

## Exclus

- gestion RH complète des absences
- arbitrage automatique inter-projets

---

# 3. Modèle de données MVP (normatif)

```prisma
model ProjectScenarioCapacitySnapshot {
  id                   String   @id @default(cuid())
  clientId             String
  projectId            String
  scenarioId           String
  resourceId           String
  snapshotDate         DateTime
  plannedLoadPct       Decimal  @db.Decimal(5, 2)
  availableCapacityPct Decimal  @db.Decimal(5, 2)
  variancePct          Decimal  @db.Decimal(5, 2)
  status               String
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  client   Client          @relation(fields: [clientId], references: [id], onDelete: Restrict)
  project  Project         @relation(fields: [projectId], references: [id], onDelete: Restrict)
  scenario ProjectScenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  resource Resource        @relation(fields: [resourceId], references: [id], onDelete: Restrict)

  @@unique([clientId, scenarioId, resourceId, snapshotDate])
  @@index([clientId, projectId, scenarioId])
  @@index([clientId, scenarioId, snapshotDate, resourceId])
}
```

---

# 4. Règles métier MVP

- capacité = donnée calculée (pas de saisie manuelle MVP)
- scope strict : `clientId` actif + `projectId` + `scenarioId`
- granularité unique : **snapshot journalier**
- chaque snapshot représente un couple `(resourceId, snapshotDate)` dans un scénario
- aucune logique inter-projets, absences, calendriers, timesheets

---

# 5. API backend (contrats figés)

```http
POST /api/projects/:projectId/scenarios/:scenarioId/capacity/recompute
GET  /api/projects/:projectId/scenarios/:scenarioId/capacity
GET  /api/projects/:projectId/scenarios/:scenarioId/capacity-summary
```

## Permissions

- `GET /capacity` : `projects.read`
- `GET /capacity-summary` : `projects.read`
- `POST /capacity/recompute` : `projects.update`

## Contrat `POST /capacity/recompute`

- exécution transactionnelle `deleteMany + createMany` (replace full)
- endpoint idempotent sur un même état des `ProjectScenarioResourcePlan`
- réponse exacte :

```json
{
  "scenarioId": "string",
  "deletedCount": 0,
  "createdCount": 0
}
```

## Contrat `GET /capacity`

- format paginé obligatoire : `{ items, total, limit, offset }`
- tri par défaut : `snapshotDate ASC, resourceId ASC`
- cas zéro snapshot : `items = []`
- DTO item snapshot :

```json
{
  "id": "string",
  "clientId": "string",
  "projectId": "string",
  "scenarioId": "string",
  "resourceId": "string",
  "snapshotDate": "2026-06-01T00:00:00.000Z",
  "plannedLoadPct": "70",
  "availableCapacityPct": "100",
  "variancePct": "30",
  "status": "UNDER_CAPACITY",
  "resource": {
    "id": "string",
    "name": "string",
    "type": "HUMAN"
  }
}
```

## Contrat `GET /capacity-summary`

- DTO summary :

```json
{
  "overCapacityCount": 0,
  "underCapacityCount": 0,
  "peakLoadPct": null,
  "averageLoadPct": null
}
```

- `OK` n’est pas exposé dans le DTO summary
- cas zéro snapshot :
  - `overCapacityCount = 0`
  - `underCapacityCount = 0`
  - `peakLoadPct = null`
  - `averageLoadPct = null`

---

# 6. KPI minimaux

- `overCapacityCount`
- `underCapacityCount`
- `peakLoadPct`
- `averageLoadPct`

Formats:

- `plannedLoadPct`: string
- `availableCapacityPct`: string
- `variancePct`: string
- `peakLoadPct`: string | null
- `averageLoadPct`: string | null
- aucune sortie `number` pour les décimaux Prisma

---

# 7. Règles de calcul (normatives)

- contribution d’un `ProjectScenarioResourcePlan` uniquement si:
  - `allocationPct` présent
  - `startDate` présent
  - `endDate` présent
- projection jour par jour sur toutes les dates inclusives entre `startDate` et `endDate`
- si plusieurs plans couvrent le même jour et la même ressource:
  - `plannedLoadPct = somme(allocationPct)`
- aucune heuristique implicite avec `plannedDays`
- `availableCapacityPct = 100.00`
- `variancePct = availableCapacityPct - plannedLoadPct`
- mapping `status`:
  - `variancePct < 0 => OVER_CAPACITY`
  - `variancePct = 0 => OK`
  - `variancePct > 0 => UNDER_CAPACITY`
- égalité évaluée sur la valeur décimale persistée (sans tolérance)

---

# 8. Tests

- surcharge détectée (`plannedLoadPct > 100`)
- sous-charge détectée (`plannedLoadPct < 100`)
- statut OK (`plannedLoadPct = 100`)
- somme correcte si plusieurs plans même ressource même jour
- recompute idempotent
- recompute replace full (`deleteMany + createMany`)
- isolation stricte client/projet/scénario
- refus si scénario archivé
- format paginé strict `GET /capacity`
- `items = []` sur `GET /capacity` si zéro snapshot
- summary zéro snapshot (`0/0/null/null`)
- décimaux sérialisés en string
- suppression d’une `Resource` référencée refusée (`onDelete: Restrict`)
- injection `capacitySummary` sur `GET scenario detail` uniquement
- `capacitySummary: null` sur la liste des scénarios

---

# 9. Intégration scénario

- `capacitySummary` est injecté dans `ProjectScenariosService.getOne`
- la liste des scénarios conserve `capacitySummary: null` dans ce lot (évite N+1)

---

# 10. Audit

- action: `project.scenario_capacity.recomputed`
- resourceType: `project_scenario_capacity`
- journalise `deletedCount` et `createdCount`
- aucun audit sur les GET

---

# 11. Points de vigilance

- aucun recalcul implicite sur les endpoints GET
- aucun élargissement de périmètre MVP (pas d’absences, calendrier, multi-projets, timesheets)
