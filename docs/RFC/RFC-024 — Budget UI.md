# **RFC-024 — Budget UI (Prévisionnel / Atterrissage / Forecast)**

## Statut

🟡 **Partielle (MVP frontend)** — écran pilotage sur `/budgets/[budgetId]` (onglet **Pilotage**) : vues Prévisionnel / Atterrissage / Forecast, densité, pagination > 50 lignes ; prévoir itérations (voir §15).

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
* une **vue forecast** : en **cible produit**, comparaison / simulation multi-scénarios ; en **MVP**, lecture **Baseline** uniquement (données RFC-023 / GET planning), sans recalcul ni scénarios inventés côté UI (voir §7 et §15).

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
| Scénario | **MVP** : affichage Baseline seul (sélecteur avec autres entrées désactivées, libellé « À venir ») ; **cible** : changer le jeu de données forecast quand l’API multi-scénarios existera |

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

👉 **Vision produit** : simulation et comparaison de scénarios lorsque le backend exposera plusieurs jeux de données forecast.

👉 **MVP implémenté** : même structure de tableau, mais **un seul scénario réellement piloté** : **Baseline** (montants issus du planning RFC-023, ex. `planningTotalAmount` vs colonnes documentées dans le code `BudgetTable`). Les autres libellés (Révisé, Optimiste, Pessimiste) sont **présents dans le sélecteur en options désactivées** avec le suffixe **« À venir »** — **aucune** simulation, multiplicateur ou extrapolation côté frontend.

---

## Structure

```text
| Ligne | Budget révisé | Forecast scénario | Atterrissage | Écart |
```

*(Colonne forecast étiquetée **Forecast (Baseline)** en MVP.)*

---

## Scénarios

Sélecteur (composant `BudgetScenarioSelect`) :

```text
Scénario : [ Baseline ▼ ]
```

### Catalogue (cible long terme)

* Baseline *(seul actif en MVP)*
* Révisé — À venir *(désactivé)*
* Optimiste — À venir *(désactivé)*
* Pessimiste — À venir *(désactivé)*

---

## Règles

* pas de colonnes multiples pour chaque scénario
* un seul scénario actif à la fois
* **MVP** : pas de changement de dataset via le sélecteur (valeur verrouillée sur Baseline) ; **cible** : changement de scénario = refresh du dataset côté API

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
* Forecast = **cible** simulation multi-scénarios ; **MVP** = lecture comparative Baseline (pas d’édition, pas de scénarios alternatifs côté données)

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
apps/web/src/features/budgets/
  components/
    budget-table.tsx
    budget-view-tabs.tsx
    budget-density-toggle.tsx
    budget-scenario-select.tsx
    budget-pilotage-section.tsx      # orchestration (exercice, queries, pagination, brouillon 12 mois)
    budget-structure-pilotage-tabs.tsx  # Structure | Pilotage (page détail budget)
  lib/
    budget-planning-grid.ts          # agrégation T1–T4 affichage, payload PUT 12 mois
    budget-exercise-month-labels.ts  # libellés mois via @starium-orchestra/budget-exercise-calendar
  hooks/
    use-budget-pilotage-planning-queries.ts
    use-budget-line-planning.ts      # dont mutation PUT multi-lignes budget
```

---

# 12. Roadmap

Les trois phases ci-dessous sont **largement couvertes en MVP** sur l’onglet Pilotage (une seule livraison incrémentale) ; des finitions restent possibles (navigation clavier §5, scénarios Forecast côté API, endpoint batch planning).

## Phase 1

* Vue Prévisionnel
* édition mensuelle
* toggle densité

## Phase 2

* Vue Atterrissage
* indicateurs visuels

## Phase 3

* Vue Forecast
* scénarios **côté API** (le MVP front couvre l’UI Baseline + placeholders « À venir »)

---

# 13. Résultat attendu

* UX simple et rapide
* adoption type Excel
* vision DAF immédiate
* extensible (scénarios, IA)

---

# 14. Résumé

> Un tableau unique, trois vues métier, un toggle de densité, et un sélecteur de scénario (**MVP** : Baseline seul + entrées futures visibles mais non actionnables) pour piloter simplement le budget.

---

# 15. Implémentation (référence code, web)

* **Entrée UX** : page `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` — bascule **Structure** (explorateur existant) / **Pilotage** (`BudgetPilotageSection`). Un seul tableau de pilotage à la fois.
* **Données** : `GET` / `PUT` `/api/budget-lines/:id/planning` via `apps/web/src/features/budgets/api/budget-line-planning.api.ts` (RFC-023) ; pas de `clientId` arbitraire côté front — isolation portée par l’API et le client actif.
* **Libellés des 12 mois** : dérivés de `BudgetExercise.startDate` via `getExerciseMonthColumnLabels` (package **`@starium-orchestra/budget-exercise-calendar`**), pas des réponses planning prises comme source unique.
* **Édition** : état local 12 mois par ligne ; PUT avec payload complet ; mode **condensé** = lecture seule + message invitant au mode mensuel.
* **Performance** : au-delà de **50** lignes, pagination côté pilotage ; évolution possible : `GET` batch planning (hors MVP), lazy / intersection pour les fenêtres de lignes.
* **Forecast (MVP)** : affichage type Baseline à partir des champs planning (`BudgetTable`, vue `forecast`) ; **`BudgetScenarioSelect`** : `Select` shadcn avec **Baseline** sélectionnable et **Révisé / Optimiste / Pessimiste** en `SelectItem` **désactivés**, libellés **« … — À venir »** — pas de simulation métier ni branchement de requête sur un autre scénario tant que l’API ne le fournit pas.
* **Permissions** : édition soumise à la permission **`budgets.update`** (cohérent avec les guards API).
