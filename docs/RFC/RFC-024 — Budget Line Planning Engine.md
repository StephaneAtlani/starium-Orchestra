# RFC-024 — Budget Line Planning Engine

## Statut

Draft

## Objectif

Permettre à une **ligne budgétaire** de disposer d’un **planning sur 12 mois** piloté par un **moteur de répartition et de calcul**, afin de :

* saisir des montants mensuels manuellement
* répartir automatiquement un budget annuel
* répartir un budget par trimestre
* positionner une dépense en **one shot**
* utiliser une **calculatrice métier** pour générer des valeurs mensuelles
* copier, coller, étirer et dupliquer rapidement les données

L’objectif est d’éviter une saisie Excel externe et de faire de Starium Orchestra le cockpit natif de planification budgétaire.

---

# 1. Problème adressé

Aujourd’hui, une ligne budgétaire porte des montants consolidés, mais pas de logique de **construction du budget mensuel**.

Or, dans la vraie vie, on veut pouvoir faire des choses comme :

* “j’ai 100 licences Microsoft sur les 3 premiers mois”
* “je prévois une hausse de 5 % sur l’année”
* “ce budget doit être ventilé mensuellement”
* “ce budget est trimestriel”
* “cette dépense tombe une seule fois”
* “je veux répartir 12 000 € automatiquement”
* “je veux coller une série depuis Excel”
* “je veux tirer la valeur comme dans un tableur”

Cette RFC répond à ce besoin.

---

# 2. Périmètre

## Inclus

* planning mensuel sur 12 mois par `BudgetLine`
* grille de saisie mensuelle
* moteur de répartition
* calculatrice métier
* modes :

  * mensuel
  * annuel réparti
  * trimestriel
  * one shot
  * croissance / variation
* copier / coller / étirer
* preview avant application
* stockage des 12 montants mensuels
* audit log

## Exclus du MVP

* formules libres type Excel
* dépendances entre lignes
* moteur avancé de saisonnalité
* IA de prévision
* collaboration temps réel multi-utilisateur
* versioning spécifique du planning

---

# 3. Principe structurant

## Décision principale

Le système **stocke toujours 12 montants mensuels**.

Les notions suivantes ne sont **pas** des stockages distincts :

* annuel
* trimestriel
* one shot
* croissance

Ce sont uniquement des **modes de calcul / d’édition** qui produisent ensuite les 12 valeurs mensuelles.

Donc :

* **stockage = 12 mois**
* **édition = manuelle ou assistée**

---

# 4. Cas d’usage métier

## 4.1 Répartition annuelle simple

Exemple :

* budget annuel = 12 000 €
* mode = annuel réparti

Résultat :

* 1 000 € par mois sur 12 mois

## 4.2 Répartition trimestrielle

Exemple :

* budget trimestriel = 3 000 € par trimestre

Résultat :

* T1 = 1 000 / 1 000 / 1 000
* T2 = 1 000 / 1 000 / 1 000
* etc.

## 4.3 One shot

Exemple :

* budget = 24 000 €
* mois d’exécution = septembre

Résultat :

* septembre = 24 000
* autres mois = 0

## 4.4 Explosion mensuelle d’un budget

Exemple :

* budget annuel = 36 000 €
* règle = répartir sur les 6 premiers mois

Résultat :

* 6 000 € de janvier à juin
* 0 de juillet à décembre

## 4.5 Calculatrice licences

Exemple :

* janvier à mars : 100 licences Microsoft
* coût unitaire mensuel : 12 €
* augmentation annuelle prévue : +5 %

Le moteur doit pouvoir calculer :

* nombre de licences
* coût mensuel total
* évolution dans le temps

Exemple possible de sortie :

* Jan = 1 200
* Fév = 1 200
* Mars = 1 200
* puis projection avec hausse selon la règle choisie

## 4.6 Croissance linéaire ou pourcentage

Exemple :

* base mensuelle = 1 000 €
* croissance annuelle = +5 %

Le moteur doit permettre au minimum deux interprétations :

### Mode A — hausse globale annualisée

Le total annuel augmente de 5 % par rapport à une base.

### Mode B — progression mensuelle

Le montant mensuel évolue progressivement sur l’année.

Le MVP doit choisir explicitement une règle pour éviter toute ambiguïté.

---

# 5. Concepts métier

## 5.1 Planning mensuel

Projection de la ligne sur 12 périodes mensuelles.

## 5.2 Planning mode

Mode de création / mise à jour du planning.

Valeurs MVP :

* `MANUAL`
* `ANNUAL_SPREAD`
* `QUARTERLY_SPREAD`
* `ONE_SHOT`
* `GROWTH`
* `CALCULATED`

## 5.3 Planning calculator

Moteur permettant de transformer des paramètres métier en 12 montants mensuels.

---

# 6. Modèle de données

## 6.1 Stockage mensuel

```prisma
model BudgetLinePlanningMonth {
  id           String   @id @default(cuid())
  clientId     String
  budgetLineId String
  monthIndex   Int
  amount       Decimal  @db.Decimal(18,2)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  client       Client     @relation(fields: [clientId], references: [id], onDelete: Restrict)
  budgetLine   BudgetLine @relation(fields: [budgetLineId], references: [id], onDelete: Cascade)

  @@unique([budgetLineId, monthIndex])
  @@index([clientId, budgetLineId])
}
```

## 6.2 Métadonnées sur la ligne

```prisma
enum BudgetLinePlanningMode {
  MANUAL
  ANNUAL_SPREAD
  QUARTERLY_SPREAD
  ONE_SHOT
  GROWTH
  CALCULATED
}
```

```prisma
model BudgetLine {
  // existant...
  planningMode        BudgetLinePlanningMode? 
  planningTotalAmount Decimal? @db.Decimal(18,2)

  planningMonths      BudgetLinePlanningMonth[]
}
```

## 6.3 Historique de calcul optionnel

Très utile même en MVP enrichi :

```prisma
model BudgetLinePlanningScenario {
  id            String   @id @default(cuid())
  clientId      String
  budgetLineId  String
  mode          BudgetLinePlanningMode
  inputJson     Json
  createdById   String?
  createdAt     DateTime @default(now())

  client        Client     @relation(fields: [clientId], references: [id], onDelete: Restrict)
  budgetLine    BudgetLine @relation(fields: [budgetLineId], references: [id], onDelete: Cascade)

  @@index([clientId, budgetLineId])
}
```

But :

* garder la trace de “comment” le planning a été généré
* utile pour audit et compréhension métier

---

# 7. Règles métier

## 7.1 Règle de stockage

Toujours 12 mois.

## 7.2 Règle de scope

Toujours scopé au `clientId` actif.

## 7.3 Montants

MVP :

* `amount >= 0`

## 7.4 Cohérence total

Décision recommandée :

* `planningTotalAmount = somme des 12 mois`
* `forecastAmount = planningTotalAmount`

Ainsi, la planification devient la projection opérationnelle de la ligne.

`revisedAmount` reste la référence budgétaire validée.
Le système peut alors montrer :

* budget validé
* budget planifié
* écart

## 7.5 Écart autorisé ou non

Deux options :

### Option stricte

`planningTotalAmount` doit être égal à `revisedAmount`

### Option souple

`planningTotalAmount` peut différer, mais l’UI affiche l’écart

Je te recommande en MVP :

* **écart autorisé**
* indicateur visuel fort
* pas de blocage dur

Pourquoi : sinon ton moteur de simulation devient vite pénible.

---

# 8. Moteurs de calcul

## 8.1 Manuel

L’utilisateur remplit les 12 mois à la main.

## 8.2 Annuel réparti

Entrées :

* montant annuel
* plage de mois concernée
* stratégie

Stratégies MVP :

* répartition égale
* répartition sur mois actifs seulement

Exemple :

* 12 000 €
* mois actifs = janvier à décembre
* résultat = 1 000 par mois

## 8.3 Trimestriel

Entrées :

* montant T1
* montant T2
* montant T3
* montant T4

Résultat :

* chaque trimestre est réparti sur ses 3 mois

## 8.4 One shot

Entrées :

* montant
* mois cible

Résultat :

* une seule cellule alimentée

## 8.5 Croissance

Entrées :

* valeur de base
* type de croissance :

  * pourcentage
  * valeur fixe
* rythme :

  * mensuel
  * trimestriel
  * annuel
* plage de mois

Exemple :

* base = 1 200
* croissance = +5 %
* rythme = annuel

Le backend doit définir la formule exacte et retourner une preview.

## 8.6 Calculatrice métier

Le MVP doit au moins permettre une formule structurée de type :

```text
montant mensuel = quantité × coût unitaire
```

Avec possibilité de variation sur :

* quantité
* coût unitaire
* pourcentage d’évolution

Exemple Microsoft 365 :

* quantité de départ = 100
* coût unitaire = 12 €
* mois actifs = 1 à 12
* croissance quantité = +5 % annuelle

Le backend génère ensuite les 12 mois.

---

# 9. API

## 9.1 Lecture

```http
GET /api/budget-lines/:id/planning
```

Retour :

* 12 mois
* total
* mode
* écart vs revisedAmount
* dernier scénario si disponible

## 9.2 Remplacement manuel

```http
PUT /api/budget-lines/:id/planning
```

Body :

```json
{
  "mode": "MANUAL",
  "months": [
    { "monthIndex": 1, "amount": 1000 },
    { "monthIndex": 2, "amount": 1000 }
  ]
}
```

## 9.3 Calcul annuel

```http
POST /api/budget-lines/:id/planning/apply-annual-spread
```

```json
{
  "annualAmount": 12000,
  "activeMonthIndexes": [1,2,3,4,5,6,7,8,9,10,11,12],
  "distribution": "EQUAL"
}
```

## 9.4 Calcul trimestriel

```http
POST /api/budget-lines/:id/planning/apply-quarterly
```

```json
{
  "quarters": [
    { "quarter": 1, "amount": 3000 },
    { "quarter": 2, "amount": 4500 },
    { "quarter": 3, "amount": 1500 },
    { "quarter": 4, "amount": 3000 }
  ]
}
```

## 9.5 One shot

```http
POST /api/budget-lines/:id/planning/apply-one-shot
```

```json
{
  "monthIndex": 9,
  "amount": 24000
}
```

## 9.6 Croissance

```http
POST /api/budget-lines/:id/planning/apply-growth
```

```json
{
  "baseAmount": 1200,
  "growthType": "PERCENT",
  "growthValue": 5,
  "growthFrequency": "YEARLY",
  "activeMonthIndexes": [1,2,3,4,5,6,7,8,9,10,11,12]
}
```

## 9.7 Calculatrice

```http
POST /api/budget-lines/:id/planning/calculate
```

```json
{
  "formulaType": "QUANTITY_X_UNIT_PRICE",
  "quantity": {
    "startValue": 100,
    "growthType": "PERCENT",
    "growthValue": 5,
    "growthFrequency": "YEARLY"
  },
  "unitPrice": {
    "value": 12
  },
  "activeMonthIndexes": [1,2,3]
}
```

Réponse :

```json
{
  "previewMonths": [
    { "monthIndex": 1, "amount": 1200 },
    { "monthIndex": 2, "amount": 1200 },
    { "monthIndex": 3, "amount": 1200 }
  ],
  "previewTotalAmount": 3600
}
```

Puis l’utilisateur clique sur **Appliquer**.

---

# 10. UX attendue

## 10.1 Grille

Colonnes :

* Jan → Déc
* Total

## 10.2 Barre d’outils

Actions :

* Manuel
* Répartir annuel
* Répartir trimestriel
* One shot
* Calculatrice
* Copier
* Coller
* Étirer
* Réinitialiser
* Preview / Appliquer

## 10.3 Panneau calculatrice

Le panneau doit permettre de choisir :

* mode de calcul
* paramètres
* preview 12 mois
* application finale

## 10.4 Comportements tableur

Obligatoires :

* édition cellule
* multi-sélection
* copier / coller TSV
* étirement horizontal
* répétition de valeur
* répétition de motif simple

---

# 11. Exemples métier

## Exemple A — 100 licences Microsoft sur 3 mois

Entrées :

* quantité = 100
* coût unitaire = 12 €
* mois actifs = janvier à mars

Résultat :

* Jan = 1200
* Fév = 1200
* Mars = 1200
* reste = 0

## Exemple B — hausse de 5 % sur l’année

Entrées :

* quantité = 100
* croissance = +5 % annuelle
* coût unitaire = 12 €
* mois actifs = janvier à décembre

Le backend calcule selon la formule retenue et montre la preview.

## Exemple C — explosion d’un budget annuel

Entrées :

* budget = 24 000 €
* mode = annuel réparti
* mois actifs = janvier à décembre

Résultat :

* 2 000 / mois

## Exemple D — budget trimestriel

Entrées :

* T1 = 9 000
* T2 = 12 000
* T3 = 6 000
* T4 = 3 000

Résultat :

* ventilation automatique sur les 12 mois

## Exemple E — one shot

Entrées :

* montant = 18 500 €
* mois = juin

Résultat :

* Juin = 18 500
* le reste = 0

---

# 12. Audit

Événements à tracer :

* `budget_line_planning.updated`
* `budget_line_planning.calculated`
* `budget_line_planning.applied_annual_spread`
* `budget_line_planning.applied_quarterly`
* `budget_line_planning.applied_one_shot`
* `budget_line_planning.applied_growth`

---

# 13. Décisions recommandées pour ton MVP

Je te recommande de figer le MVP comme ça :

## MVP phase 1

* grille 12 mois
* saisie manuelle
* copier / coller
* étirer
* annuel réparti
* trimestriel
* one shot

## MVP phase 2

* croissance
* calculatrice quantité × coût unitaire
* preview avant application
* sauvegarde du scénario de calcul

Parce que sinon la première implémentation devient trop lourde.

