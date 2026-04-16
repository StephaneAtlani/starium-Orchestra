# RFC-PROJ-SC-006 — Scenario Risk Modeling

## Statut

📝 Draft

## Priorité

Moyenne à haute

## Dépendances

- `RFC-PROJ-SC-001`
- `RFC-PROJ-018` — `ProjectRisk` MVP
- `RFC-RISK-TAXONOMY`

---

# 1. Objectif

Permettre à chaque scénario de porter ses **risques projetés** afin de comparer les options non seulement en coût et délai, mais aussi en criticité.

---

# 2. Périmètre

## Inclus

- registre de risques par scénario
- probabilité / impact / criticité
- lien optionnel vers taxonomie existante
- synthèse de criticité

## Exclus

- workflow complet de traitement du risque
- bibliothèque transverse de plans de remédiation

---

# 3. Modèle de données

```prisma
model ProjectScenarioRisk {
  id                String   @id @default(cuid())
  clientId          String
  scenarioId        String
  riskTypeId        String?

  title             String
  description       String?
  probability       Int
  impact            Int
  criticalityScore  Int
  mitigationPlan    String?
  ownerLabel        String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([clientId, scenarioId])
}
```

---

# 4. Règles métier

- `criticalityScore = probability * impact`
- bornes recommandées `1..5`
- `riskTypeId` doit rester client-scopé
- un risque scénario n’est pas automatiquement un risque opérationnel actif du projet

---

# 5. API backend

```http
GET    /api/projects/:projectId/scenarios/:scenarioId/risks
POST   /api/projects/:projectId/scenarios/:scenarioId/risks
PATCH  /api/projects/:projectId/scenarios/:scenarioId/risks/:riskId
DELETE /api/projects/:projectId/scenarios/:scenarioId/risks/:riskId
GET    /api/projects/:projectId/scenarios/:scenarioId/risk-summary
```

---

# 6. KPI minimaux

- `criticalRiskCount`
- `averageCriticality`
- `maxCriticality`

---

# 7. Tests

- calcul de criticité
- filtrage client
- résumé des risques d’un scénario

---

# 8. Plan d’implémentation

1. Ajouter `ProjectScenarioRisk`.
2. Réutiliser les conventions DTO / validation des risques projet.
3. Exposer CRUD + résumé.
4. Raccorder au cockpit scénario.

---

# 9. Points de vigilance

- ne pas mélanger registre de simulation et registre opérationnel réel
- garder la taxonomie existante comme référentiel partagé
