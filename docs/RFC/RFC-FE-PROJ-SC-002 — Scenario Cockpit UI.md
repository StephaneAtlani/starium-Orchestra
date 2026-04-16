# RFC-FE-PROJ-SC-002 — Scenario Cockpit UI

## Statut

📝 Draft

## Priorité

Moyenne à haute

## Dépendances

- `RFC-FE-PROJ-SC-001`
- `RFC-PROJ-SC-002`
- `RFC-PROJ-SC-003`
- `RFC-PROJ-SC-004`
- `RFC-PROJ-SC-005`
- `RFC-PROJ-SC-006`

---

# 1. Objectif

Créer un **cockpit de décision scénario** comparant :

- scénario actif
- baseline
- réalisé projet

sur quatre axes :

- budget
- ressources
- délais
- risques

---

# 2. UX attendue

- vue synthèse multi-cartes
- comparateur entre 2 scénarios
- indicateurs de variance
- alertes surcharge / dérive / criticité
- navigation vers détail financier, charge, planning, risques

---

# 3. Données attendues

Le cockpit consomme des données déjà agrégées par l’API :

- `financialSummary`
- `resourceSummary`
- `timelineSummary`
- `riskSummary`
- `capacitySummary`

Le frontend ne calcule que le rendu et les comparaisons visuelles simples.

---

# 4. Structure suggérée

```text
apps/web/src/features/projects/scenario-cockpit/
```

Composants suggérés :

- `ScenarioCockpitPage`
- `ScenarioComparisonSelector`
- `ScenarioVarianceCards`
- `ScenarioCapacityAlertPanel`
- `ScenarioRiskPanel`

---

# 5. Tests

- affichage comparatif baseline vs scénario
- rendu des alertes
- absence d’ID brut visible
- états vides / chargement

---

# 6. Plan d’implémentation

1. Introduire les contrats API de synthèse.
2. Créer page/section cockpit.
3. Ajouter comparaison baseline vs option.
4. Ajouter panneaux d’alertes et drill-down.

---

# 7. Points de vigilance

- cockpit après stabilisation backend, pas avant
- attention au bruit visuel : le but est la décision, pas l’exhaustivité
- préférer des indicateurs métier lisibles à des structures brutes
