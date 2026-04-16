# RFC-PROJ-SC-003 — Scenario Resource Planning

## Statut

📝 Draft

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

---

# 6. KPI minimaux

- `plannedDaysTotal`
- `plannedCostTotal`
- `plannedFtePeak`
- `distinctResources`

---

# 7. Tests

- interdiction d’utiliser une ressource d’un autre client
- calcul du coût dérivé via `dailyRate`
- validation dates / pourcentage
- consolidation de plusieurs plans sur un même scénario

---

# 8. Plan d’implémentation

1. Ajouter `ProjectScenarioResourcePlan`.
2. Exposer CRUD projet-scopé.
3. Brancher le résumé coût + charge.
4. Préparer l’intégration future avec le moteur capacité.

---

# 9. Points de vigilance

- ne pas dépendre des modèles staffing retirés
- garder une séparation nette entre planifié scénario et temps réalisé
- éviter de coder des rôles ressource comme IDs visibles en UI
