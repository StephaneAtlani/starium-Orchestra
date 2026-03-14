# RFC-016 — Budget Reporting API

## Statut

Draft

## Titre

**Budget Reporting API — Agrégations et KPI budgétaires**

---

# 1. Objectif

Introduire une **API de reporting budgétaire** permettant d’exposer des **agrégations financières consolidées** et des **KPI budgétaires** pour le cockpit de pilotage.

L’API permet de produire des synthèses pour trois niveaux :

* **exercice budgétaire**
* **budget**
* **enveloppe**

Ces données seront utilisées par le frontend pour alimenter :

* dashboards
* cartes KPI
* tableaux de pilotage
* vues de synthèse budgétaires.

Le reporting repose sur les données déjà existantes dans :

* `BudgetExercise`
* `Budget`
* `BudgetEnvelope`
* `BudgetLine`

Les calculs se basent sur les montants consolidés déjà maintenus dans `BudgetLine`.

---

# 2. Problème résolu

Les RFC précédentes permettent :

* de créer la structure budgétaire
* de gérer les lignes budgétaires
* de suivre les allocations financières
* de recalculer les montants des lignes

Cependant, l’API actuelle ne fournit pas de **vision consolidée directement exploitable pour le pilotage**.

Par exemple :

* total consommé d’un exercice
* taux de consommation d’un budget
* enveloppes en dépassement
* répartition RUN / BUILD
* synthèse budgétaire globale

La RFC-016 ajoute cette **couche analytique de lecture**.

---

# 3. Périmètre

La RFC-016 introduit :

* un module backend **budget-reporting**
* des endpoints REST de lecture
* des agrégations financières
* des KPI budgétaires
* des listes analytiques paginées
* des ratios budgétaires

Toutes les données sont **calculées côté backend**.

---

# 4. Architecture

## 4.1 Module backend

Nouveau module :

```
apps/api/src/modules/budget-reporting
```

Structure :

```
budget-reporting
 ├ controller
 ├ service
 ├ dto
 ├ mappers
 └ types
```

Le module dépend uniquement de :

* `PrismaModule`

Il ne modifie pas les modules :

* budget-management
* financial-core

Il consomme simplement leurs données.

---

# 5. Sécurité

Toutes les routes utilisent les guards standards :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permission requise :

```
budgets.read
```

Les requêtes sont toujours exécutées dans le contexte du :

```
X-Client-Id
```

---

# 6. Niveaux d’agrégation

Les agrégations sont possibles à trois niveaux.

## 6.1 Exercice budgétaire

Agrégation de toutes les lignes appartenant aux budgets de l’exercice.

## 6.2 Budget

Agrégation de toutes les lignes appartenant au budget.

## 6.3 Enveloppe

Agrégation des lignes associées à l’enveloppe.

Option possible :

```
includeChildren=true
```

pour inclure les sous-enveloppes.

---

# 7. KPI budgétaires

Les KPI sont calculés à partir des champs présents dans `BudgetLine`.

## Montants agrégés

```
totalInitialAmount
totalRevisedAmount
totalForecastAmount
totalCommittedAmount
totalConsumedAmount
totalRemainingAmount
```

## Ratios

```
consumptionRate = consumed / revised
commitmentRate = committed / revised
forecastRate = forecast / revised
```

## Variances

```
varianceAmount = revised - consumed
forecastGapAmount = forecast - revised
```

## Indicateurs de volumétrie

```
budgetCount
envelopeCount
lineCount
```

## Alertes

```
overConsumedLineCount
overCommittedLineCount
negativeRemainingLineCount
```

---

# 8. Endpoints

## 8.1 Résumé exercice

```
GET /api/budget-reporting/exercises/:id/summary
```

Retourne les KPI consolidés d’un exercice.

---

## 8.2 Résumé budget

```
GET /api/budget-reporting/budgets/:id/summary
```

Retourne les KPI consolidés d’un budget.

---

## 8.3 Résumé enveloppe

```
GET /api/budget-reporting/envelopes/:id/summary
```

Retourne les KPI consolidés d’une enveloppe.

---

## 8.4 Budgets d’un exercice

```
GET /api/budget-reporting/exercises/:id/budgets
```

Liste des budgets avec KPI synthétiques.

Pagination standard :

```
offset
limit
search
status
```

---

## 8.5 Enveloppes d’un budget

```
GET /api/budget-reporting/budgets/:id/envelopes
```

Retourne les enveloppes avec indicateurs financiers.

Filtres possibles :

```
offset
limit
type
parentId
includeChildren
```

---

## 8.6 Lignes d’une enveloppe

```
GET /api/budget-reporting/envelopes/:id/lines
```

Permet un **drill-down simple**.

Chaque ligne retourne :

* montants
* ratios
* indicateurs d’alerte.

---

## 8.7 Répartition RUN / BUILD

```
GET /api/budget-reporting/budgets/:id/breakdown-by-type
```

Retourne la répartition des montants par type d’enveloppe.

---

# 9. Calcul des KPI

Les calculs sont réalisés **côté backend**.

Les agrégations sont faites sur les `BudgetLine`.

Approche MVP :

* récupération des lignes via Prisma
* agrégation en TypeScript dans le service.

---

# 10. Gestion des devises

Le reporting suppose une **devise homogène dans un périmètre**.

Si plusieurs devises sont détectées :

```
400 Bad Request
```

Aucune conversion monétaire n’est réalisée.

---

# 11. Pagination

Les endpoints de liste utilisent la pagination standard :

```
offset
limit
```

Structure de réponse :

```
{
  items: [],
  total: number,
  limit: number,
  offset: number
}
```

---

# 12. Gestion des erreurs

Codes retournés :

```
401 Unauthorized
403 Forbidden
404 Not Found
400 Bad Request
```

---

# 13. Performance

Pour le MVP :

* agrégations calculées à la volée
* pas de cache
* pas de pré-agrégation

Optimisations possibles ultérieurement :

* cache Redis
* vues SQL
* agrégations matérialisées.

---

# 14. Tests

Tests attendus :

### unit tests

* calcul KPI
* ratios
* variances
* lignes en dépassement

### integration tests

* isolation client
* permissions
* pagination
* filtres

---

# 15. Impact frontend

Cette API permettra d’alimenter :

* dashboard budget
* cartes KPI
* tableaux de synthèse
* vues d’analyse budgétaire.

Le frontend ne recalcule pas les montants.

---

# 16. Ce que la RFC ne fait pas

La RFC-016 **ne crée pas un moteur BI complet**.

Elle ne fournit pas :

### Pas de BI avancée

* pas de cube analytique
* pas de dimensions dynamiques
* pas de requêtes analytiques personnalisées.

### Pas d’historique temporel

* pas de reporting à date
* pas de comparaison temporelle.

Ces fonctionnalités seront traitées via :

```
Budget Snapshots
```

### Pas d’exports

Pas de :

* export Excel
* export CSV
* export PDF.

### Pas de consolidation multi-client

Toutes les requêtes sont limitées au :

```
client actif
```

### Pas de multi-devise

Aucune conversion monétaire.

### Pas de génération de graphiques

Le backend retourne uniquement des **données analytiques**.

### Pas de cache

Les KPI sont calculés **en temps réel**.

### Pas de nouvelles permissions

La permission utilisée reste :

```
budgets.read
```

---

# 17. Critères d’acceptation

La RFC est considérée implémentée lorsque :

* les endpoints de reporting existent
* les agrégations sont correctes
* les ratios sont calculés côté backend
* les routes sont protégées
* l’isolation client est respectée
* les réponses sont exploitables directement par le frontend.

---

# 18. RFC suivantes possibles

Les évolutions naturelles seront :

```
RFC-017 Budget Reporting Frontend
RFC-018 Budget Alerts
RFC-019 Budget Export
RFC-020 Budget History
```
