# RFC-PROJ-SC-007 — Scenario Selection Workflow

## Statut

📝 Draft

## Priorité

Très haute

## Dépendances

- `RFC-PROJ-SC-001`
- `RFC-PROJ-013` — historisation projet
- `RFC-013` — audit logs

---

# 1. Objectif

Formaliser la **décision de sélection d’un scénario** quand un projet passe en préparation d’exécution, afin d’obtenir :

- une baseline unique
- un historique de décision
- un archivage automatique des alternatives
- un point de référence pour le pilotage futur

---

# 2. Déclencheur métier

Le workflow s’exécute quand le projet passe vers :

```text
PLANNED
IN_PROGRESS
```

Si aucun scénario n’est encore sélectionné, la transition doit être bloquée ou exiger une sélection explicite selon la politique retenue.

---

# 3. Règles métier

- un seul scénario sélectionné par projet
- sélection atomique via transaction
- archivage automatique des scénarios concurrents en `ARCHIVED`
- création d’un point projet / historique de décision
- facultatif au MVP : commentaire de décision et motif

---

# 4. API backend

```http
POST /api/projects/:projectId/scenarios/:scenarioId/select
POST /api/projects/:projectId/scenarios/:scenarioId/select-and-transition
```

Payload recommandé :

```json
{
  "targetProjectStatus": "PLANNED",
  "decisionNote": "Option retenue après arbitrage CODIR",
  "archiveOtherScenarios": true
}
```

---

# 5. Effets attendus

1. le scénario ciblé passe `SELECTED`
2. `isBaseline = true`
3. les autres scénarios passent `ARCHIVED`
4. le projet peut passer à l’état cible
5. un audit et un historique projet sont produits

---

# 6. Audit / historique

Événements :

```text
project.scenario.selected
project.scenario.auto_archived
project.status.changed_from_scenario_selection
```

Historisation projet :

- type suggéré `SCENARIO_SELECTION`
- résumé de la décision
- référence du scénario retenu

---

# 7. Tests

- blocage si scénario inexistant ou hors client
- transaction complète sur sélection + archivage + changement statut projet
- refus si plusieurs scénarios sélectionnés suite à race condition

---

# 8. Plan d’implémentation

1. Ajouter service transactionnel de sélection.
2. Raccorder au workflow de statut projet.
3. Ajouter audit + point d’historique.
4. Exposer endpoint combiné `select-and-transition`.

---

# 9. Points de vigilance

- très fort risque de dette si la sélection reste purement UI
- le backend doit être la source de vérité de la baseline
- prévoir l’idempotence des doubles clics / retries
