# **RFC-023 — Budget Prévisionnel (Planning & Atterrissage)**

## Statut

Implémenté (MVP)

> **Homonymie** : le dépôt contient aussi [RFC-023 — Client RBAC Administration](./RFC-023%20—%20Client%20RBAC%20Administration.md) (autre périmètre). Ce fichier couvre uniquement le **prévisionnel / atterrissage** budgétaire.

## Priorité

Haute

## Dépendances

* RFC-015-1B — Financial Core Backend 
* RFC-015-2 — Budget Management Backend 
* RFC-016 — Budget Reporting API
* RFC-013 — Audit Logs

---

# 1. Objectif

Mettre en place un **moteur de budget prévisionnel** permettant :

* de répartir une `BudgetLine` dans le temps (mensualisation)
* de calculer un **atterrissage budgétaire**
* de détecter les dérives avant clôture
* de fournir une expérience **type Excel + calculatrice**

---

# 2. Principe métier

## 2.1 Niveau de vérité

* **Saisie = BudgetLine**
* **Agrégation = BudgetEnvelope / Budget / Exercise**

👉 Le prévisionnel est **attaché à la ligne budgétaire**, jamais à l’enveloppe.

---

## 2.2 Rôle du prévisionnel

Le prévisionnel permet de déterminer :

```text
Atterrissage = Consommé + Engagé + Prévision restant
```

---

## 2.3 Position dans l’architecture

Hiérarchie existante :

```
BudgetExercise
  → Budget
    → BudgetEnvelope
      → BudgetLine
```

Extension logique (une ligne = un jeu de 12 mois + métadonnées de planning sur la ligne) :

```
BudgetLine  (planningMode, planningTotalAmount, forecastAmount, …)
  → BudgetLinePlanningMonth[]   (monthIndex 1–12, montants)
  → BudgetLinePlanningScenario? (dernier scénario appliqué, modes non manuels)
```

> Il **n’existe pas** de table `BudgetLinePlanning` séparée dans le schéma actuel : l’agrégat est porté par `BudgetLine` + lignes `BudgetLinePlanningMonth` (voir §4).

---

# 3. Périmètre MVP

## Inclus

* planning mensuel (12 mois)
* saisie manuelle
* modes de calcul simples
* recalcul backend
* atterrissage
* écarts
* vue Excel-like
* audit logs

## Exclus

* snapshots
* workflow de validation
* multi-scénarios
* IA
* dépendances entre lignes

---

# 4. Concepts métier — modèle implémenté (Prisma)

## 4.1 Champs sur `BudgetLine`

Le prévisionnel d’agrégation (total, mode, prévision globale) est sur la ligne :

* `planningMode` (`BudgetLinePlanningMode` nullable)
* `planningTotalAmount`, `forecastAmount` (cohérents avec le recalcul backend)

Les montants **consommé / engagé / révisé** viennent du **financial core** sur la même ligne (`consumedAmount`, `committedAmount`, `revisedAmount`, …).

## 4.2 `BudgetLinePlanningMonth`

Une ligne par `(budgetLineId, monthIndex)` avec `monthIndex` **1–12** : mois d’**exercice** alignés sur le **mois calendaire UTC** de `BudgetExercise.startDate` (mois 1 = ce mois-là, puis +1 mois civile jusqu’à 12). La logique calendaire partagée API / UI est dans le package **`@starium-orchestra/budget-exercise-calendar`** (`packages/budget-exercise-calendar/`).

## 4.3 `BudgetLinePlanningScenario`

Enregistre le dernier scénario appliqué (modes non `MANUAL`) avec `inputJson` pour traçabilité.

## 4.4 Enum `BudgetLinePlanningMode` (schéma actuel)

Au-delà du MVP initial (MANUAL / ANNUAL_SPREAD / ONE_SHOT), le schéma inclut notamment `QUARTERLY_SPREAD`, `GROWTH`, `CALCULATED`. Voir `apps/api/prisma/schema.prisma`.

---

# 5. Règles métier

## 5.1 Une ligne = un planning

```text
1 BudgetLine = au plus 1 jeu cohérent de 12 BudgetLinePlanningMonth + champs planning sur BudgetLine
```

---

## 5.2 12 mois obligatoires

* toujours 12 mois
* jamais de trou

---

## 5.3 Cohérence client

Toutes les entités doivent partager le même `clientId`.

---

## 5.4 Recalcul obligatoire

À chaque modification :

* recalcul du planning total
* recalcul du forecastAmount
* recalcul de l’atterrissage

---

## 5.5 Backend source de vérité

* aucun calcul métier en frontend
* frontend = affichage uniquement

---

# 6. Logique de calcul

## 6.1 Total prévisionnel

```text
planningTotalAmount = SUM(months)
```

---

## 6.2 Atterrissage

```text
landing =
consumedAmount
+ committedAmount
+ remainingPlanning
```

---

## 6.3 Écarts (API)

* **Écart prévision totale vs révisé** : `planningDelta` = `planningTotalAmount - revisedAmount` (alias de transition : `deltaVsRevised`).
* **Écart atterrissage vs révisé** : `landingVariance` = `landing - revisedAmount` (alias : `variance`).

Les alias sont **redondants** ; leur retrait est annoncé dans le [CHANGELOG](../../CHANGELOG.md) du dépôt — les intégrations et le BI doivent migrer vers les noms canoniques.

---

# 7. Modes de calcul

## 7.1 MANUAL

* saisie libre sur 12 mois

---

## 7.2 ANNUAL_SPREAD

```text
monthly = total / 12
```

---

## 7.3 ONE_SHOT

```text
un seul mois = total
les autres = 0
```

---

# 8. API

Préfixe global : `/api`. Toutes les routes sont sous **client actif** (guards §11) ; pas de `clientId` arbitraire dans le corps.

## 8.1 GET planning

```http
GET /api/budget-lines/:id/planning
GET /api/budget-lines/:id/planning?referenceDate=2026-06-15T00:00:00.000Z
```

* `referenceDate` (optionnel) : date de référence pour le calcul de **prévision restante** / atterrissage ; défaut = jour courant UTC côté serveur.

### Réponse (extraits)

Les champs incluent notamment : `planningMode`, `months[]` avec `monthIndex`, `month` (alias de `monthIndex`), `amount`, `monthColumnLabels`, `planningTotalAmount`, `revisedAmount`, `planningDelta`, `landingVariance`, `consumedAmount`, `committedAmount`, `remainingPlanning`, `landing`, `exerciseStartDate`, `exerciseEndDate`, alias `deltaVsRevised` / `variance`, `lastScenario`.

## 8.2 Mise à jour manuelle

```http
PUT /api/budget-lines/:id/planning
```

```json
{
  "months": [
    { "monthIndex": 1, "amount": 2200 },
    { "monthIndex": 2, "amount": 2200 }
  ]
}
```

(12 mois attendus côté validation métier.)

## 8.3 Apply mode (route unifiée)

```http
POST /api/budget-lines/:id/planning/apply-mode
```

Corps : `{ "mode": "<BudgetLinePlanningMode>", "annualSpread"?: {...}, "quarterly"?: {...}, "oneShot"?: {...}, "growth"?: {...}, "calculation"?: {...} }` selon le mode.

Les routes `POST .../planning/apply-annual-spread`, `apply-quarterly`, etc. restent disponibles (**legacy**) et appellent la même logique métier.

---

# 9. Audit logs

Actions **canoniques** écrites en base :

* `budget_line.planning.updated` — saisie manuelle (PUT).
* `budget_line.planning.applied_mode` — application d’un mode (y compris via `apply-mode` ou routes legacy).
* `budget_line.planning.previewed` — prévisualisation calcul (sans persistance du planning).

Chaque entrée utilise `resourceType` = `budget_line`, `resourceId` = id de ligne, `oldValue` / `newValue` avec notamment `mode` et le détail des montants / entrées.

Les anciennes chaînes d’action (ex. `budget_line_planning.updated`) ne sont plus émises ; les **filtres** liste audit élargissent la requête via le mapping centralisé `apps/api/src/modules/audit-logs/budget-planning-audit-action-map.ts` (compatibilité lecture).

---

# 10. UX

## 10.1 Vue Prévisionnel

* grille type Excel
* 12 mois
* édition cellule
* scroll horizontal

---

## 10.2 Calculatrice

Drawer :

* choix du mode
* paramètres
* preview
* appliquer

---

## 10.3 Vue Atterrissage

* budget
* consommé
* engagé
* atterrissage
* écart
* alertes

---

# 11. Sécurité

Guards standards :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permissions :

```
budgets.read
budgets.update
```

---

# 12. Performance

* batch update à prévoir
* debounce frontend
* recalcul transactionnel

---

# 13. Roadmap

## V1 (MVP)

* planning mensuel
* 3 modes
* UI Excel
* atterrissage

## V2

* quarterly spread
* growth
* duplication année

## V3

* snapshots
* multi-scénarios

---

# 14. Résumé

> Le budget prévisionnel est une projection mensuelle par ligne budgétaire, pilotée par le backend, permettant de calculer l’atterrissage et d’anticiper les dérives.

---

# 15. Implémentation dans le dépôt

| Élément | Emplacement |
| --- | --- |
| Service planning + atterrissage | `apps/api/src/modules/budget-management/budget-lines/budget-line-planning.service.ts` |
| Contrôleur | `apps/api/src/modules/budget-management/budget-lines/budget-line-planning.controller.ts` |
| DTO réponse / apply-mode | `apps/api/src/modules/budget-management/budget-lines/dto/` |
| Calendrier d’exercice (partagé API + web) | `packages/budget-exercise-calendar/` |
| Mapping audit (filtres legacy) | `apps/api/src/modules/audit-logs/budget-planning-audit-action-map.ts` + fusion dans `audit-logs-read-legacy.ts` |
| UI pilotage (tableau multi-vues Prévisionnel / Atterrissage / Forecast) | `apps/web/src/features/budgets/components/budget-pilotage-section.tsx`, `budget-table.tsx` ; requêtes `use-budget-pilotage-planning-queries.ts`, mutations `use-budget-line-planning.ts`, agrégation affichage `lib/budget-planning-grid.ts` |
| *(Périmètre)* | L’**explorateur** (`budget-explorer-row.tsx`, RFC-FE-004) **n’expose pas** de modale planning ni de calculatrice : l’édition des mois passe par l’onglet **Pilotage** sur `/budgets/[budgetId]`. |
| Journal des changements API / alias | [CHANGELOG.md](../../CHANGELOG.md) à la racine du repo |
