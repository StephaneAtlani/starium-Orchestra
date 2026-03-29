# **RFC-024 — Budget UI (Prévisionnel / Atterrissage / Forecast)**

## Statut

Draft

## Priorité

Très haute

## Dépendances

* RFC-023 — Budget Prévisionnel (fiabilisation)
* RFC-016 — Budget Reporting API
* RFC-015-2 — Budget Management Backend

---

# 1. Objectif

Mettre en place une **interface de pilotage budgétaire unifiée** permettant :

* une **édition rapide type Excel** (prévisionnel)
* une **lecture décisionnelle DAF/DG** (atterrissage)
* une **simulation de scénarios** (forecast)

👉 Le tout basé sur **un tableau unique multi-vues**, sans explosion de colonnes.

---

# 2. Principe UX fondamental

> **Un seul tableau, plusieurs vues métier**

Interdictions :

* ❌ ajout dynamique de colonnes multiples
* ❌ duplication des indicateurs
* ❌ mélange édition / analyse

---

# 3. Structure globale de l’écran

## Header

```text
[ Prévisionnel ] [ Atterrissage ] [ Forecast ]
[ Mensuel | Condensé ]
[ Scénario ▼ ]
```

### Rôles

| Élément  | Fonction                          |
| -------- | --------------------------------- |
| Vue      | change la logique métier affichée |
| Densité  | change le niveau de détail        |
| Scénario | change le dataset forecast        |

---

# 4. Tableau unique

Un seul composant table est utilisé.

```text
BudgetTable (shared component)
```

Il est alimenté différemment selon :

* la vue active
* la densité
* le scénario

---

# 5. Vue 1 — Prévisionnel

## Objectif

👉 édition rapide des montants mensuels

---

## Mode Mensuel

```text
| Ligne | Jan | Fév | Mar | ... | Déc | Total |
```

### Règles

* édition inline
* recalcul backend immédiat
* navigation clavier

---

## Mode Condensé

```text
| Ligne | T1 | T2 | T3 | T4 | Total |
```

---

## Comportement

* source = BudgetLinePlanningMonth
* mise à jour via API planning
* recalcul RFC-023 automatique

---

# 6. Vue 2 — Atterrissage

## Objectif

👉 pilotage DAF / DG

---

## Mode Condensé (par défaut)

```text
| Ligne | Budget révisé | Consommé | Engagé | Prévision restante | Atterrissage | Écart |
```

---

## Définitions

| Champ              | Source                     |
| ------------------ | -------------------------- |
| Budget révisé      | BudgetLine.revisedAmount   |
| Consommé           | BudgetLine.consumedAmount  |
| Engagé             | BudgetLine.committedAmount |
| Prévision restante | RFC-023 remainingPlanning  |
| Atterrissage       | RFC-023 landing            |
| Écart              | RFC-023 landingVariance    |

---

## Règles UX

* pas d’édition directe
* indicateurs colorés :

  * rouge si dépassement
  * neutre sinon

---

# 7. Vue 3 — Forecast

## Objectif

👉 simulation et comparaison de scénarios

---

## Structure

```text
| Ligne | Budget révisé | Forecast scénario | Atterrissage | Écart |
```

---

## Scénarios

Sélecteur :

```text
Scénario : [ Baseline ▼ ]
```

### Exemples

* Baseline
* Révisé
* Optimiste
* Pessimiste

---

## Règles

* pas de colonnes multiples pour chaque scénario
* un seul scénario actif à la fois
* changement = refresh dataset

---

# 8. Densité (mode affichage)

## Toggle global

```text
[ Mensuel | Condensé ]
```

---

## Comportement

| Mode     | Description                        |
| -------- | ---------------------------------- |
| Mensuel  | 12 colonnes                        |
| Condensé | agrégation trimestrielle ou totale |

---

# 9. Règles UX globales

## 9.1 Hiérarchie

* Prévisionnel = édition
* Atterrissage = décision
* Forecast = simulation

---

## 9.2 Simplicité

* maximum 8–10 colonnes visibles
* pas de duplication
* pas de panneau latéral permanent

---

## 9.3 Interaction

* édition inline uniquement
* feedback immédiat
* pas de bouton “enregistrer global”

---

# 10. Backend impact

## Aucun changement majeur

Réutilisation :

* BudgetLine
* BudgetLinePlanningMonth
* RFC-023 calculs
* Budget Reporting API

---

## Endpoints utilisés

| Action           | Endpoint        |
| ---------------- | --------------- |
| lecture planning | GET planning    |
| update mois      | PUT planning    |
| apply mode       | POST apply-mode |
| KPI              | reporting API   |

---

# 11. Frontend architecture

## Composants

```text
BudgetTable
BudgetViewTabs
BudgetDensityToggle
BudgetScenarioSelect
```

---

## Structure

```text
/features/budgets/
  components/
    budget-table.tsx
    budget-view-tabs.tsx
    budget-density-toggle.tsx
    budget-scenario-select.tsx
```

---

# 12. Roadmap

## Phase 1

* Vue Prévisionnel
* édition mensuelle
* toggle densité

## Phase 2

* Vue Atterrissage
* indicateurs visuels

## Phase 3

* Vue Forecast
* scénarios

---

# 13. Résultat attendu

* UX simple et rapide
* adoption type Excel
* vision DAF immédiate
* extensible (scénarios, IA)

---

# 14. Résumé

> Un tableau unique, trois vues métier, un toggle de densité, et un sélecteur de scénario pour piloter simplement le budget.
