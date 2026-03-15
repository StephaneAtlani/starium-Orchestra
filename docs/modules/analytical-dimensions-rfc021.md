# Dimensions analytiques et ventilation budgétaire (RFC-021)

Ce document décrit l’implémentation des **dimensions analytiques** et de la **ventilation par centres de coûts** sur les lignes budgétaires (RFC-021). Référence : [docs/RFC/RFC-021 — Analytical Dimensions & Budget Allocation Splits.md](../RFC/RFC-021%20—%20Analytical%20Dimensions%20%26%20Budget%20Allocation%20Splits.md).

---

## 1. Objectif

Enrichir chaque **BudgetLine** avec :

- un **compte comptable** obligatoire (General Ledger Account) ;
- un **compte analytique** optionnel (Analytical Ledger Account) ;
- une **portée** : ENTERPRISE (dépense globale) ou ANALYTICAL (ventilée par centres de coûts) ;
- une **ventilation en %** par centre de coûts lorsque la portée est ANALYTICAL (somme = 100 %).

Cas typiques : dépense globale entreprise (Firewall), dépense mono-service (AutoCAD 100 % DMOP), dépense multi-services (MasterPro 50 % DMOP / 50 % DCP).

---

## 2. Modèle de données

### 2.1 Enum

- **BudgetLineAllocationScope** : `ENTERPRISE` | `ANALYTICAL`.

### 2.2 Référentiels (catalogues client)

| Modèle                   | Rôle                         | Champs principaux              |
|--------------------------|------------------------------|---------------------------------|
| GeneralLedgerAccount     | Compte comptable (obligatoire par ligne) | clientId, code, name, description?, isActive, sortOrder |
| AnalyticalLedgerAccount   | Compte analytique optionnel  | idem                           |
| CostCenter               | Centre de coûts / service    | idem                           |

Unicité : `@@unique([clientId, code])` pour chaque référentiel. Index : `@@index([clientId, isActive])`.

### 2.3 Extension BudgetLine

- **generalLedgerAccountId** (String, obligatoire) — FK vers GeneralLedgerAccount.
- **analyticalLedgerAccountId** (String?, optionnel) — FK vers AnalyticalLedgerAccount.
- **allocationScope** (BudgetLineAllocationScope, défaut ENTERPRISE).
- Relations : `generalLedgerAccount`, `analyticalLedgerAccount`, `costCenterSplits`.

### 2.4 BudgetLineCostCenterSplit

- **budgetLineId**, **costCenterId**, **percentage** (Decimal 5,2).
- Contrainte : `@@unique([budgetLineId, costCenterId])` (un centre de coûts ne peut apparaître qu’une fois par ligne).
- Index : `@@index([budgetLineId])`, `@@index([clientId, budgetLineId])`, `@@index([clientId, costCenterId])`.

---

## 3. Règles métier

- **Compte comptable** : obligatoire pour toute création/mise à jour de BudgetLine.
- **Compte analytique** : optionnel ; une ligne ENTERPRISE peut en avoir un (ENTERPRISE ≠ « pas d’analytique »).
- **ENTERPRISE** : 0 split. Si `costCenterSplits` non vide → rejet. Passage d’une ligne ANALYTICAL à ENTERPRISE → suppression automatique des splits.
- **ANALYTICAL** : au moins 1 split ; somme des `percentage` = 100 (tolérance 0,01). Unicité des `costCenterId` par ligne (validation métier + contrainte DB).
- **Cohérence client** : GLA, ALA et centres de coûts des splits doivent appartenir au client actif (X-Client-Id).
- **Update** : si allocationScope = ANALYTICAL et `costCenterSplits` non fourni dans le body → conservation des splits existants ; si fourni → remplacement.

---

## 4. API

### 4.1 Référentiels

| Ressource | Routes | Permissions |
|-----------|--------|-------------|
| Comptes comptables | `GET/POST /api/general-ledger-accounts`, `GET/PATCH /api/general-ledger-accounts/:id` | budgets.general-ledger-accounts.read / .create / .update |
| Comptes analytiques | `GET/POST /api/analytical-ledger-accounts`, `GET/PATCH /api/analytical-ledger-accounts/:id` | budgets.analytical-ledger-accounts.read / .create / .update |
| Centres de coûts | `GET/POST /api/cost-centers`, `GET/PATCH /api/cost-centers/:id` | budgets.cost-centers.read / .create / .update |

Body create/update type : `code`, `name`, `description?`, `isActive?`, `sortOrder?`. Query list : `search`, `isActive`, `offset`, `limit`. Tous scopés client (X-Client-Id).

### 4.2 Lignes budgétaires

- **Create** : body avec `generalLedgerAccountId` (obligatoire), `analyticalLedgerAccountId?`, `allocationScope?` (défaut ENTERPRISE), `costCenterSplits?` : `Array<{ costCenterId, percentage }>` (requis si ANALYTICAL).
- **Update** : mêmes champs en optionnel ; `costCenterSplits` remplace la ventilation uniquement s’il est fourni et allocationScope = ANALYTICAL.
- **List** : query `costCenterId?`, `generalLedgerAccountId?`, `allocationScope?` pour filtrer les lignes.
- Réponses : inclusion de `generalLedgerAccount`, `analyticalLedgerAccount`, `costCenterSplits` (avec `costCenter`).

### 4.3 Reporting (budget-reporting)

- **GET /api/budget-reporting/budgets/:id/totals-by-cost-center** : totaux par centre de coûts. **Uniquement les lignes allocationScope = ANALYTICAL.** Contribution d’un split = lineAmount × percentage / 100. Sources : `revisedAmount` (total révisé), `remainingAmount` (restant).
- **GET /api/budget-reporting/budgets/:id/totals-by-general-ledger-account** : totaux par compte comptable. **Toutes les lignes** (ENTERPRISE + ANALYTICAL). Agrégation par generalLedgerAccountId ; somme revisedAmount et remainingAmount.

Permission : `budgets.read`.

### 4.4 Import (budget-import)

- **execute** : option `defaultGeneralLedgerAccountId` (optionnel). Si une ligne n’a pas de compte dans les données importées → utilisation de cette option ou du compte client par défaut (code `999999`).
- Lignes créées/mises à jour par l’import : `allocationScope = ENTERPRISE`, pas de splits, `analyticalLedgerAccountId = null`.

---

## 5. Versioning (budget-versioning)

Lors de la création d’une baseline ou d’une révision, les lignes sont dupliquées avec un **helper unique** `cloneBudgetLineWithAnalytics` qui recopie :

- generalLedgerAccountId, analyticalLedgerAccountId, allocationScope ;
- tous les **BudgetLineCostCenterSplit** (même costCenterId et percentage).

Les lignes source sont chargées avec la relation `costCenterSplits` pour que la copie soit complète.

---

## 6. Audit

Création et mise à jour de lignes : audit avec `generalLedgerAccountId`, `analyticalLedgerAccountId`, `allocationScope`, résumé des splits (`costCenterSplitsSummary`). Référentiels : actions `general_ledger_account.created/updated`, `analytical_ledger_account.created/updated`, `cost_center.created/updated`.

---

## 7. Migration des données existantes

Une migration dédiée a créé un compte comptable par défaut (code `999999`, name « Non affecté ») par client ayant des BudgetLine, puis a affecté ce compte à toutes les lignes existantes et rendu `generalLedgerAccountId` NOT NULL.

---

## 8. Références

- **RFC** : [RFC-021 — Analytical Dimensions & Budget Allocation Splits](../RFC/RFC-021%20—%20Analytical%20Dimensions%20%26%20Budget%20Allocation%20Splits.md)
- **API** : [docs/API.md](../API.md) (référentiels, budget-lines, reporting, import)
- **Module Budget** : [docs/modules/budget-mvp.md](budget-mvp.md)
