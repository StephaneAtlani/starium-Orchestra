# RFC-021 — Analytical Dimensions & Budget Allocation Splits

## Statut

Draft

## Objectif

Permettre d’enrichir une **ligne budgétaire (`BudgetLine`)** avec les informations nécessaires au pilotage financier et analytique :

* un **compte comptable** obligatoire
* un **compte comptable analytique** optionnel
* une affectation **globale entreprise** ou **analytique**
* une **ventilation par centre de coûts** lorsqu’une dépense doit être répartie entre plusieurs services

L’objectif est de couvrir des cas simples et concrets comme :

* **Firewall Palo Alto** → dépense générale entreprise
* **AutoCAD** → dépense analytique affectée à **DMOP**
* **MasterPro** → dépense analytique ventilée **50% DMOP / 50% DCP**

Cette RFC doit rester **MVP-compatible** :

* pas d’usine à gaz
* pas de moteur comptable complexe
* pas de workflow
* pas de règles automatiques avancées

---

# 1. Principe métier

La **BudgetLine** reste le **niveau budgétaire le plus fin**.

Hiérarchie :

```text
BudgetExercise
  → Budget
    → BudgetEnvelope
      → BudgetLine
```

La `BudgetLine` représente une dépense prévue précise, par exemple :

* Firewall Palo Alto
* AutoCAD
* MasterPro
* Microsoft 365
* Contrat télécom Orange

C’est donc **sur la BudgetLine** que l’on porte :

* le libellé de dépense
* les montants budgétaires
* le compte comptable
* éventuellement le compte analytique
* éventuellement la ventilation analytique

---

# 2. Cas d’usage couverts

## 2.1 Dépense générale entreprise

Exemple :

* `Firewall Palo Alto`

Caractéristiques :

* dépense commune à toute l’entreprise
* pas de ventilation entre services

Résultat attendu :

* compte comptable obligatoire
* compte analytique optionnel
* aucune ventilation obligatoire
* portée = `ENTERPRISE`

---

## 2.2 Dépense analytique mono-service

Exemple :

* `AutoCAD`

Caractéristiques :

* dépense rattachée à un seul service

Résultat attendu :

* compte comptable obligatoire
* compte analytique optionnel
* 1 ventilation :

  * `DMOP = 100%`
* portée = `ANALYTICAL`

---

## 2.3 Dépense analytique multi-services

Exemple :

* `MasterPro`

Caractéristiques :

* dépense répartie entre plusieurs services

Résultat attendu :

* compte comptable obligatoire
* compte analytique optionnel
* 2 ventilations :

  * `DMOP = 50%`
  * `DCP = 50%`
* portée = `ANALYTICAL`

---

# 3. Périmètre MVP

## Inclus

* catalogue de **centres de coûts**
* catalogue de **comptes comptables**
* catalogue de **comptes comptables analytiques**
* rattachement d’un **compte comptable** à chaque `BudgetLine`
* rattachement optionnel d’un **compte analytique**
* choix d’une portée de ligne :

  * `ENTERPRISE`
  * `ANALYTICAL`
* ventilation d’une ligne par **centres de coûts**
* validation que la somme des ventilations = **100%**
* lecture et reporting par centre de coûts

## Exclus

* hiérarchie de centres de coûts
* ventilation sur plusieurs dimensions à la fois
* ventilation sur `FinancialAllocation`
* ventilation sur `FinancialEvent`
* règles automatiques d’affectation
* moteur comptable ERP complet
* répartition en montants saisis manuellement ligne par ligne
* gestion multi-devise analytique

---

# 4. Concepts métier

## 4.1 General Ledger Account

Compte comptable général de la ligne.

Exemples :

* 606300
* 606400
* 615000

Il est **obligatoire** pour toute `BudgetLine`.

---

## 4.2 Analytical Ledger Account

Compte comptable analytique optionnel.

Il permet d’ajouter une lecture analytique compatible avec les pratiques DAF, sans rendre le système complexe.

Exemples :

* 921000
* 921500

Il est **facultatif**.

---

## 4.3 Cost Center

Centre de coûts ou service bénéficiaire.

Exemples :

* DMOP
* DCP
* DAF
* DSI
* RH
* DG

Chaque client possède son propre catalogue.

---

## 4.4 Allocation Scope

Définit le mode d’affectation de la ligne budgétaire :

* `ENTERPRISE` : dépense globale entreprise
* `ANALYTICAL` : dépense ventilée analytiquement

---

## 4.5 Allocation Split

Ventilation d’une `BudgetLine` vers un ou plusieurs centres de coûts, sous forme de pourcentage.

Exemple :

* DMOP = 50%
* DCP = 50%

---

# 5. Modèle de données

## 5.1 Enum

```prisma
enum BudgetLineAllocationScope {
  ENTERPRISE
  ANALYTICAL
}
```

---

## 5.2 GeneralLedgerAccount

```prisma
model GeneralLedgerAccount {
  id          String   @id @default(cuid())
  clientId    String
  code        String
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)
  budgetLines BudgetLine[]

  @@unique([clientId, code])
  @@index([clientId, isActive])
}
```

---

## 5.3 AnalyticalLedgerAccount

```prisma
model AnalyticalLedgerAccount {
  id          String   @id @default(cuid())
  clientId    String
  code        String
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)
  budgetLines BudgetLine[]

  @@unique([clientId, code])
  @@index([clientId, isActive])
}
```

---

## 5.4 CostCenter

```prisma
model CostCenter {
  id          String   @id @default(cuid())
  clientId    String
  code        String
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)
  splits      BudgetLineCostCenterSplit[]

  @@unique([clientId, code])
  @@index([clientId, isActive])
}
```

---

## 5.5 Extension de BudgetLine

Ajouts au modèle `BudgetLine` :

```prisma
generalLedgerAccountId    String
analyticalLedgerAccountId String?
allocationScope           BudgetLineAllocationScope @default(ENTERPRISE)
```

Relations :

```prisma
generalLedgerAccount   GeneralLedgerAccount     @relation(fields: [generalLedgerAccountId], references: [id], onDelete: Restrict)
analyticalLedgerAccount AnalyticalLedgerAccount? @relation(fields: [analyticalLedgerAccountId], references: [id], onDelete: SetNull)
costCenterSplits       BudgetLineCostCenterSplit[]
```

---

## 5.6 BudgetLineCostCenterSplit

```prisma
model BudgetLineCostCenterSplit {
  id           String   @id @default(cuid())
  clientId     String
  budgetLineId String
  costCenterId String
  percentage   Decimal  @db.Decimal(5,2)
  createdAt    DateTime @default(now())

  client       Client     @relation(fields: [clientId], references: [id], onDelete: Restrict)
  budgetLine   BudgetLine @relation(fields: [budgetLineId], references: [id], onDelete: Cascade)
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Restrict)

  @@unique([budgetLineId, costCenterId])
  @@index([clientId, budgetLineId])
  @@index([clientId, costCenterId])
}
```

---

# 6. Règles métier

## 6.1 Compte comptable obligatoire

Toute `BudgetLine` doit avoir un `generalLedgerAccountId`.

Aucune ligne budgétaire ne peut être créée ni mise à jour sans compte comptable.

---

## 6.2 Compte analytique optionnel

Une `BudgetLine` peut avoir un `analyticalLedgerAccountId`.

Ce champ est facultatif.

---

## 6.3 Portée de ligne

### `ENTERPRISE`

La ligne est considérée comme globale entreprise.

Règles :

* aucun split obligatoire
* si des splits existent, ils doivent être refusés

### `ANALYTICAL`

La ligne est ventilée sur un ou plusieurs centres de coûts.

Règles :

* au moins un split requis
* somme des pourcentages = 100%

---

## 6.4 Somme des ventilations

Si `allocationScope = ANALYTICAL`, alors :

```text
sum(percentage) = 100.00
```

Sinon la création ou mise à jour doit être rejetée.

---

## 6.5 Unicité par centre de coûts

Une ligne ne peut pas contenir deux splits sur le même centre de coûts.

Exemple invalide :

* DMOP = 30%
* DMOP = 70%

---

## 6.6 Cohérence client

Toutes les entités liées doivent appartenir au même client :

* `BudgetLine.clientId`
* `GeneralLedgerAccount.clientId`
* `AnalyticalLedgerAccount.clientId`
* `CostCenter.clientId`
* `BudgetLineCostCenterSplit.clientId`

Toute incohérence doit être rejetée.

---

## 6.7 Inactivation

Les comptes et centres de coûts peuvent être désactivés (`isActive = false`).

Conséquences :

* non utilisables pour de nouvelles saisies
* conservés sur les lignes existantes

---

## 6.8 Suppression

Pour le MVP :

* suppression physique déconseillée
* privilégier l’inactivation

---

# 7. Exemples métier

## 7.1 Firewall Palo Alto

```text
BudgetLine
- name: Firewall Palo Alto
- generalLedgerAccount: 606800
- analyticalLedgerAccount: null
- allocationScope: ENTERPRISE
- costCenterSplits: none
```

---

## 7.2 AutoCAD

```text
BudgetLine
- name: AutoCAD
- generalLedgerAccount: 606500
- analyticalLedgerAccount: 921000
- allocationScope: ANALYTICAL

Splits
- DMOP: 100%
```

---

## 7.3 MasterPro

```text
BudgetLine
- name: MasterPro
- generalLedgerAccount: 606500
- analyticalLedgerAccount: 921500
- allocationScope: ANALYTICAL

Splits
- DMOP: 50%
- DCP: 50%
```

---

# 8. API

Toutes les routes utilisent :

* `Authorization: Bearer <accessToken>`
* `X-Client-Id: <clientId>`

Avec les guards standards existants.

---

## 8.1 Comptes comptables

### Liste

```http
GET /api/general-ledger-accounts
```

### Création

```http
POST /api/general-ledger-accounts
```

### Mise à jour

```http
PATCH /api/general-ledger-accounts/:id
```

---

## 8.2 Comptes comptables analytiques

### Liste

```http
GET /api/analytical-ledger-accounts
```

### Création

```http
POST /api/analytical-ledger-accounts
```

### Mise à jour

```http
PATCH /api/analytical-ledger-accounts/:id
```

---

## 8.3 Centres de coûts

### Liste

```http
GET /api/cost-centers
```

### Création

```http
POST /api/cost-centers
```

### Mise à jour

```http
PATCH /api/cost-centers/:id
```

---

## 8.4 Budget lines

### Création / mise à jour d’une ligne

Le payload de `BudgetLine` doit inclure :

```json
{
  "name": "MasterPro",
  "generalLedgerAccountId": "gla_xxx",
  "analyticalLedgerAccountId": "ala_xxx",
  "allocationScope": "ANALYTICAL",
  "costCenterSplits": [
    { "costCenterId": "cc_dmop", "percentage": 50 },
    { "costCenterId": "cc_dcp", "percentage": 50 }
  ]
}
```

Pour une ligne entreprise :

```json
{
  "name": "Firewall Palo Alto",
  "generalLedgerAccountId": "gla_xxx",
  "analyticalLedgerAccountId": null,
  "allocationScope": "ENTERPRISE",
  "costCenterSplits": []
}
```

---

## 8.5 Lecture

### Liste de lignes avec filtres

```http
GET /api/budget-lines?costCenterId=cc_dmop
GET /api/budget-lines?generalLedgerAccountId=gla_xxx
GET /api/budget-lines?allocationScope=ANALYTICAL
```

---

# 9. Permissions

Les permissions restent rattachées au module `budgets`.

Nouvelles permissions proposées :

* `budgets.cost-centers.read`

* `budgets.cost-centers.create`

* `budgets.cost-centers.update`

* `budgets.general-ledger-accounts.read`

* `budgets.general-ledger-accounts.create`

* `budgets.general-ledger-accounts.update`

* `budgets.analytical-ledger-accounts.read`

* `budgets.analytical-ledger-accounts.create`

* `budgets.analytical-ledger-accounts.update`

La création / mise à jour des lignes continue d’utiliser :

* `budgets.create`
* `budgets.update`

---

# 10. Reporting

Cette RFC permet immédiatement :

* budget total par centre de coûts
* budget total par compte comptable
* liste des lignes analytiques
* liste des lignes générales entreprise
* lecture des logiciels et services partagés via leur ventilation budgétaire

Exemples :

## Totaux par centre de coûts

| Centre de coûts |    Budget |
| --------------- | --------: |
| DMOP            | 120 000 € |
| DCP             |  95 000 € |
| DAF             |  60 000 € |

## Totaux par compte comptable

| Compte | Libellé   |    Budget |
| ------ | --------- | --------: |
| 606500 | Logiciels | 210 000 € |
| 606800 | Sécurité  |  90 000 € |

---

# 11. Audit

Doivent générer un `AuditLog` :

* création / modification d’un centre de coûts
* création / modification d’un compte comptable
* création / modification d’un compte analytique
* création / modification d’une `BudgetLine`
* modification des `costCenterSplits`

---

# 12. UX MVP

## 12.1 Référentiels

Écrans simples pour :

* centres de coûts
* comptes comptables
* comptes analytiques

---

## 12.2 Édition d’une ligne budgétaire

Champs :

* libellé
* enveloppe
* montants
* compte comptable
* compte analytique optionnel
* portée :

  * générale entreprise
  * analytique

Si `ANALYTICAL` :

* tableau simple de ventilation :

| Centre de coûts | Pourcentage |
| --------------- | ----------: |
| DMOP            |          50 |
| DCP             |          50 |

Validation immédiate :

* total = 100%

---

# 13. Décisions structurantes

1. **La BudgetLine reste le niveau fin de la dépense budgétaire.**

2. **Chaque BudgetLine a un compte comptable obligatoire.**

3. **Le compte analytique est optionnel.**

4. **Une ligne peut être soit globale entreprise, soit analytique.**

5. **Si analytique, la ventilation se fait par centres de coûts avec total 100%.**

6. **Pas de moteur analytique avancé au MVP.**

7. **Pas de multi-dimensions complexes au MVP.**

---

# 14. Résumé

RFC-021 introduit une **lecture analytique simple et utile** du budget, sans complexifier le MVP.

Elle permet de gérer proprement :

* les dépenses générales entreprise
* les dépenses affectées à un service
* les dépenses ventilées entre plusieurs services
* l’association à un compte comptable
* l’association optionnelle à un compte analytique

En résumé :

> **BudgetLine = dépense prévue**
>
> avec :
>
> * **1 compte comptable obligatoire**
> * **0 ou 1 compte analytique**
> * **0 split si entreprise**
> * **1 à N splits si analytique**
> * **total des splits = 100%**
