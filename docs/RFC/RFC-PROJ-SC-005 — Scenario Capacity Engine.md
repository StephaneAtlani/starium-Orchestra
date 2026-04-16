# RFC-PROJ-SC-005 — Scenario Capacity Engine

## Statut

📝 Draft

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

# 3. Modèle de données minimal

```prisma
model ProjectScenarioCapacitySnapshot {
  id                  String   @id @default(cuid())
  clientId            String
  scenarioId          String
  resourceId          String
  periodStartDate     DateTime
  periodEndDate       DateTime
  plannedLoadPct      Decimal? @db.Decimal(5,2)
  availableCapacityPct Decimal? @db.Decimal(5,2)
  variancePct         Decimal? @db.Decimal(5,2)
  status              String?
  createdAt           DateTime @default(now())

  @@index([clientId, scenarioId, resourceId])
}
```

---

# 4. Règles métier

- capacité = donnée calculée, pas une saisie libre prioritaire au MVP
- le moteur doit rester **project-scoped** et **client-scoped**
- `status` recommandé : `OK`, `UNDER_CAPACITY`, `OVER_CAPACITY`

---

# 5. API backend

```http
POST /api/projects/:projectId/scenarios/:scenarioId/capacity/recompute
GET  /api/projects/:projectId/scenarios/:scenarioId/capacity
GET  /api/projects/:projectId/scenarios/:scenarioId/capacity-summary
```

---

# 6. KPI minimaux

- `overCapacityCount`
- `underCapacityCount`
- `peakLoadPct`
- `averageLoadPct`

---

# 7. Tests

- surcharge détectée sur ressource unique
- absence de fuite de données d’autres projets / clients
- cohérence du résumé agrégé

---

# 8. Plan d’implémentation

1. Définir la source de capacité disponible.
2. Ajouter snapshot calculé.
3. Exposer recompute + lecture.
4. Raccorder les alertes au cockpit scénario.

---

# 9. Points de vigilance

- clarifier très tôt la source de vérité capacité
- éviter un calcul temps réel trop coûteux sur chaque lecture
- versionner les snapshots si l’UX de comparaison le demande
