# RFC-PROJ-SC-003 — Scenario Resource Planning

## Statut

✅ Implémentée (backend MVP)

## Priorité

Haute

## Dépendances

- `RFC-PROJ-SC-001`
- `RFC-RES-001` — catalogue ressources
- `RFC-TEAM-009` — temps réalisé
- `RFC-TEAM-020` — modèle `Resource HUMAN`

## Hypothèse importante

Les anciennes RFC `RFC-TEAM-007` et `RFC-TEAM-008` sont retirées. Cette RFC ne doit pas réintroduire `TeamResourceAssignment`.

---

# 1. Objectif

Permettre à un scénario de projeter la **mobilisation des ressources** :

- qui intervient
- sur quelle période
- avec quelle charge
- pour quel rôle scénario

---

# 2. Périmètre

## Inclus

- allocations scénario sur `Resource`
- charge par période
- rôle projet / rôle scénario
- coût dérivé via `dailyRate` si ressource `HUMAN`

## Exclus

- timesheet de réalisation
- capacité agrégée multi-scénarios

La capacité est traitée dans `RFC-PROJ-SC-005`.

---

# 3. Modèle de données

```prisma
model ProjectScenarioResourcePlan {
  id               String   @id @default(cuid())
  clientId         String
  scenarioId       String
  resourceId       String

  roleLabel        String?
  allocationPct    Decimal? @db.Decimal(5,2)
  plannedDays      Decimal? @db.Decimal(8,2)
  startDate        DateTime?
  endDate          DateTime?
  notes            String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([clientId, scenarioId])
  @@index([clientId, resourceId])
}
```

---

# 4. Règles métier

- `resourceId` doit appartenir au client actif
- on affiche toujours `resource.name` / `resource.code`, jamais `resourceId`
- `allocationPct` est borné entre `0` et `100`
- `plannedDays >= 0`
- `endDate >= startDate` si les deux sont renseignées

---

# 5. API backend

```http
GET    /api/projects/:projectId/scenarios/:scenarioId/resource-plans
POST   /api/projects/:projectId/scenarios/:scenarioId/resource-plans
PATCH  /api/projects/:projectId/scenarios/:scenarioId/resource-plans/:planId
DELETE /api/projects/:projectId/scenarios/:scenarioId/resource-plans/:planId
GET    /api/projects/:projectId/scenarios/:scenarioId/resource-summary
```

Contrats MVP backend implémentés :

- `GET .../resource-plans` retourne `{ items, total, limit, offset }` (tri par défaut `createdAt desc`).
- `POST` et `PATCH` retournent un `ProjectScenarioResourcePlanDto` avec nested `resource` (`id`, `name`, `code`, `type`) et décimaux sérialisés en `string`.
- `DELETE` retourne `204 No Content`.
- `GET .../resource-summary` retourne `ProjectScenarioResourceSummaryDto` (`plannedDaysTotal`, `plannedCostTotal`, `plannedFtePeak`, `distinctResources`).

---

# 6. KPI minimaux

- `plannedDaysTotal`
- `plannedCostTotal`
- `plannedFtePeak`
- `distinctResources`

Définitions MVP backend :

- `plannedDaysTotal` : somme des `plannedDays` (`null` traité comme `0`).
- `plannedCostTotal` : somme des contributions ligne `(plannedDays ?? 0) * dailyRate`, uniquement pour `resource.type === HUMAN` avec `dailyRate` renseigné (sinon contribution `0`).
- `plannedFtePeak` : pic de charge (`allocationPct / 100`) calculé jour par jour, bornes `startDate`/`endDate` inclusives ; `null` si aucune ligne n’a simultanément `allocationPct`, `startDate`, `endDate`.
- `distinctResources` : nombre de `resourceId` distincts du scénario (plusieurs plans de la même ressource comptent une seule fois).

---

# 7. Tests

- interdiction d’utiliser une ressource d’un autre client
- calcul du coût dérivé via `dailyRate`
- validation dates / pourcentage
- consolidation de plusieurs plans sur un même scénario
- refus mutations si scénario `ARCHIVED`
- aucune audit log sur les lectures (`GET /resource-plans`, `GET /resource-summary`)

---

# 8. Plan d’implémentation

1. ✅ Ajouter `ProjectScenarioResourcePlan`.
2. ✅ Exposer CRUD projet-scopé.
3. ✅ Brancher le résumé coût + charge.
4. ⏭️ Préparer l’intégration future avec le moteur capacité (hors MVP RFC-SC-003).

## 8.1 Référence d’implémentation (repo)

- **Prisma** : `apps/api/prisma/schema.prisma` — modèle `ProjectScenarioResourcePlan` + relations `Client` / `ProjectScenario` / `Resource`.
- **Migration** : `apps/api/prisma/migrations/20260420150000_project_scenario_resource_plans/migration.sql`.
- **Module NestJS** : `apps/api/src/modules/project-scenarios/`.
- **Routes** : `resource-plans` + `resource-summary` sous `/api/projects/:projectId/scenarios/:scenarioId/...`.
- **Service** : `project-scenario-resource-plans.service.ts` (validations, agrégats, sérialisation DTO).
- **Audit** : `project.scenario_resource_plan.created|updated|deleted` (`resourceType=project_scenario_resource_plan`).
- **Tests** : `project-scenario-resource-plans.service.spec.ts`, `project-scenario-resource-plans.controller.spec.ts`.

---

# 9. Points de vigilance

- ne pas dépendre des modèles staffing retirés
- garder une séparation nette entre planifié scénario et temps réalisé
- éviter de coder des rôles ressource comme IDs visibles en UI
