# RFC-015-3 — Snapshots budgétaires

## Statut

Draft

## Dépend de

* RFC-015-1A — Schéma Prisma Budget MVP
* RFC-015-1B — Financial Core Backend
* RFC-015-2 — Budget Management Backend
* RFC-013 — Audit logs
* RFC-012 — Permissions / RBAC

## Objectif

Permettre de :

* **figer un budget** à un instant donné
* **comparer plusieurs états dans le temps**
* **préparer le reporting, la gouvernance et l’audit**

Le snapshot budgétaire est une **copie figée, immuable et traçable** d’un périmètre budgétaire, prise à une date donnée, dans le contexte d’un client.

Il ne remplace pas les tables métier vivantes (`Budget`, `BudgetEnvelope`, `BudgetLine`, `FinancialAllocation`, `FinancialEvent`) ; il sert de **référence historique**.

---

# 1. Problème adressé

Le MVP Budget permet déjà de gérer :

* exercices
* budgets
* enveloppes
* lignes
* allocations financières
* événements financiers
* recalculs de montants agrégés sur les lignes

Mais il manque la capacité à :

* conserver une **photo fidèle** avant une révision
* produire un **point d’arrêt officiel** pour comité, reporting mensuel ou audit
* comparer un état courant avec un état antérieur
* justifier a posteriori les écarts d’un budget

Sans snapshot, les montants évoluent en continu et il devient difficile de répondre précisément à des questions comme :

* quel était l’état du budget au 31 janvier ?
* qu’est-ce qui a changé entre la V1 et la V2 ?
* quel était le forecast avant arbitrage ?
* sur quelle base le comité a validé ce budget ?

---

# 2. Principes fonctionnels

## 2.1 Définition

Un **snapshot budgétaire** est un enregistrement immuable contenant :

* les métadonnées du snapshot
* le périmètre concerné
* la structure figée :

  * budget
  * enveloppes
  * lignes
* les montants figés au moment de la prise
* éventuellement des agrégats et métadonnées utiles au reporting

## 2.2 Périmètre du snapshot MVP

Dans cette RFC, un snapshot porte sur **un budget**.

Donc :

* 1 snapshot = 1 `Budget`
* le snapshot inclut toutes les `BudgetEnvelope`
* le snapshot inclut toutes les `BudgetLine`
* le snapshot fige les montants calculés déjà présents sur chaque ligne

Les `FinancialAllocation` et `FinancialEvent` ne sont **pas copiés unitairement** dans le MVP, sauf sous forme d’agrégats déjà matérialisés dans la ligne (`forecastAmount`, `committedAmount`, `consumedAmount`, `remainingAmount`).

## 2.3 Immutabilité

Un snapshot :

* ne peut **jamais être modifié**
* ne peut **jamais être recalculé**
* ne peut **jamais être réécrit**
* peut uniquement être :

  * créé
  * lu
  * comparé
  * éventuellement archivé logiquement plus tard

## 2.4 Cas d’usage

Exemples :

* fin de mois
* avant / après arbitrage budgétaire
* avant clôture d’exercice
* avant présentation CODIR / DG / DAF
* avant audit
* avant import ou réallocation massive

---

# 3. Règles métier

## 3.1 Scope client

Comme tout le core financier :

* tout snapshot appartient à un `clientId`
* le `clientId` est toujours déduit du client actif
* aucune API n’accepte `clientId` dans le body
* toutes les lectures et écritures sont filtrées sur le client actif

## 3.2 Périmètre autorisé

On ne peut créer un snapshot que :

* pour un `Budget` du client actif
* si le budget existe
* si son `exerciseId` appartient au même client
* si les enveloppes / lignes appartiennent au même client

## 3.3 Nommage

Chaque snapshot possède :

* un `name` libre mais obligatoire
* un `code` généré si absent, ex. `SNAP-20260314-001`

Exemples de noms :

* `Budget initial 2026`
* `Arrêté mensuel Janvier 2026`
* `Pré-CODIR Mars 2026`
* `Version validée V2`

## 3.4 Unicité

Dans le périmètre d’un client :

* `code` doit être unique
* plusieurs snapshots peuvent exister pour un même budget

## 3.5 Suppression

MVP :

* **pas de suppression physique**
* pas de modification
* pas d’endpoint DELETE

## 3.6 Permissions

* lecture : `budgets.read`
* création snapshot : `budgets.create`

Aucun droit d’update ni delete sur un snapshot dans le MVP.

---

# 4. Modèle de données

## 4.1 Nouveaux enums Prisma

```prisma
enum BudgetSnapshotStatus {
  ACTIVE
  ARCHIVED
}
```

Le MVP peut fonctionner avec seulement `ACTIVE`, mais `ARCHIVED` prépare la suite.

---

## 4.2 Modèle `BudgetSnapshot`

```prisma
model BudgetSnapshot {
  id              String               @id @default(cuid())
  clientId         String
  budgetId         String
  exerciseId       String
  name             String
  code             String               @unique
  description      String?
  snapshotDate     DateTime
  status           BudgetSnapshotStatus @default(ACTIVE)

  budgetName       String
  budgetCode       String?
  budgetCurrency   String
  budgetStatus     BudgetStatus

  totalInitialAmount   Decimal @db.Decimal(18, 2)
  totalRevisedAmount   Decimal @db.Decimal(18, 2)
  totalForecastAmount  Decimal @db.Decimal(18, 2)
  totalCommittedAmount Decimal @db.Decimal(18, 2)
  totalConsumedAmount  Decimal @db.Decimal(18, 2)
  totalRemainingAmount Decimal @db.Decimal(18, 2)

  createdByUserId  String?
  createdAt        DateTime @default(now())

  client           Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)
  budget           Budget   @relation(fields: [budgetId], references: [id], onDelete: Restrict)
  exercise         BudgetExercise @relation(fields: [exerciseId], references: [id], onDelete: Restrict)
  createdByUser    User?    @relation(fields: [createdByUserId], references: [id], onDelete: SetNull)

  lines            BudgetSnapshotLine[]

  @@index([clientId])
  @@index([budgetId])
  @@index([exerciseId])
  @@index([snapshotDate])
  @@index([clientId, budgetId])
}
```

---

## 4.3 Modèle `BudgetSnapshotLine`

Chaque ligne du snapshot est une copie figée d’une `BudgetLine`.

```prisma
model BudgetSnapshotLine {
  id               String   @id @default(cuid())
  snapshotId        String
  clientId          String

  budgetLineId      String
  budgetId          String
  envelopeId        String?

  envelopeName      String?
  envelopeCode      String?
  envelopeType      BudgetEnvelopeType?

  lineCode          String
  lineName          String
  expenseType       ExpenseType
  currency          String
  lineStatus        BudgetLineStatus

  initialAmount     Decimal @db.Decimal(18, 2)
  revisedAmount     Decimal @db.Decimal(18, 2)
  forecastAmount    Decimal @db.Decimal(18, 2)
  committedAmount   Decimal @db.Decimal(18, 2)
  consumedAmount    Decimal @db.Decimal(18, 2)
  remainingAmount   Decimal @db.Decimal(18, 2)

  createdAt         DateTime @default(now())

  snapshot          BudgetSnapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)

  @@index([snapshotId])
  @@index([clientId])
  @@index([budgetLineId])
  @@index([budgetId])
  @@index([envelopeId])
}
```

---

# 5. Données figées dans le snapshot

## 5.1 Métadonnées figées au niveau budget

Le snapshot stocke explicitement :

* `budgetName`
* `budgetCode`
* `budgetCurrency`
* `budgetStatus`

Cela garantit qu’un renommage futur du budget n’altère pas la lecture historique.

## 5.2 Données figées au niveau ligne

Chaque `BudgetSnapshotLine` stocke :

* identité métier de la ligne
* rattachement enveloppe
* type de dépense
* devise
* statut de ligne
* montants agrégés

## 5.3 Pourquoi ne pas référencer uniquement les tables vivantes

Parce qu’un snapshot doit rester fidèle même si, plus tard :

* le budget change de nom
* une enveloppe change de code
* une ligne est renommée
* les montants évoluent
* une ligne change de statut

Le snapshot est donc une **copie figée**, pas une simple vue.

---

# 6. API REST

Préfixe global : `/api`

## 6.1 Endpoints

### Créer un snapshot

`POST /api/budget-snapshots`

Body :

```json
{
  "budgetId": "cmbudget123",
  "name": "Arrêté mensuel Janvier 2026",
  "description": "Snapshot avant comité budgétaire de février",
  "snapshotDate": "2026-01-31T23:59:59.000Z"
}
```

Règles :

* `budgetId` obligatoire
* `name` obligatoire
* `snapshotDate` optionnel
* si absent, valeur par défaut = date/heure serveur
* `code` généré côté backend
* `clientId` interdit dans le body

Réponse 201 :

```json
{
  "id": "cmsnap001",
  "budgetId": "cmbudget123",
  "exerciseId": "cmexercise001",
  "name": "Arrêté mensuel Janvier 2026",
  "code": "SNAP-20260131-001",
  "description": "Snapshot avant comité budgétaire de février",
  "snapshotDate": "2026-01-31T23:59:59.000Z",
  "status": "ACTIVE",
  "budgetName": "Budget IT 2026",
  "budgetCode": "BUD-2026-IT",
  "budgetCurrency": "EUR",
  "budgetStatus": "ACTIVE",
  "totalInitialAmount": 100000,
  "totalRevisedAmount": 105000,
  "totalForecastAmount": 98000,
  "totalCommittedAmount": 60000,
  "totalConsumedAmount": 22000,
  "totalRemainingAmount": 23000,
  "createdByUserId": "cmuser001",
  "createdAt": "2026-03-14T15:00:00.000Z"
}
```

---

### Lister les snapshots

`GET /api/budget-snapshots?budgetId=<id>&limit=20&offset=0`

Filtres MVP :

* `budgetId` optionnel
* pagination simple `limit` / `offset`

Tri par défaut :

* `snapshotDate DESC`
* puis `createdAt DESC`

Réponse 200 :

```json
{
  "items": [
    {
      "id": "cmsnap001",
      "budgetId": "cmbudget123",
      "name": "Arrêté mensuel Janvier 2026",
      "code": "SNAP-20260131-001",
      "snapshotDate": "2026-01-31T23:59:59.000Z",
      "status": "ACTIVE",
      "budgetName": "Budget IT 2026",
      "totalRevisedAmount": 105000,
      "totalForecastAmount": 98000,
      "totalCommittedAmount": 60000,
      "totalConsumedAmount": 22000,
      "totalRemainingAmount": 23000,
      "createdAt": "2026-03-14T15:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

### Lire un snapshot

`GET /api/budget-snapshots/:id`

Réponse 200 :

* métadonnées du snapshot
* totaux
* lignes figées

```json
{
  "id": "cmsnap001",
  "budgetId": "cmbudget123",
  "exerciseId": "cmexercise001",
  "name": "Arrêté mensuel Janvier 2026",
  "code": "SNAP-20260131-001",
  "snapshotDate": "2026-01-31T23:59:59.000Z",
  "status": "ACTIVE",
  "budgetName": "Budget IT 2026",
  "budgetCurrency": "EUR",
  "totals": {
    "initialAmount": 100000,
    "revisedAmount": 105000,
    "forecastAmount": 98000,
    "committedAmount": 60000,
    "consumedAmount": 22000,
    "remainingAmount": 23000
  },
  "lines": [
    {
      "id": "cmsnapline001",
      "budgetLineId": "cmline001",
      "envelopeName": "RUN Infrastructure",
      "lineCode": "BL-INF-001",
      "lineName": "Licences Microsoft",
      "expenseType": "OPEX",
      "currency": "EUR",
      "lineStatus": "ACTIVE",
      "initialAmount": 20000,
      "revisedAmount": 22000,
      "forecastAmount": 21000,
      "committedAmount": 15000,
      "consumedAmount": 8000,
      "remainingAmount": -1000
    }
  ]
}
```

---

### Comparer deux snapshots

`GET /api/budget-snapshots/compare?leftSnapshotId=<id>&rightSnapshotId=<id>`

Objectif :

* comparer deux états d’un même budget
* produire des écarts globaux et par ligne

Réponse 200 :

```json
{
  "leftSnapshot": {
    "id": "cmsnap001",
    "name": "Budget initial 2026",
    "snapshotDate": "2026-01-05T09:00:00.000Z"
  },
  "rightSnapshot": {
    "id": "cmsnap002",
    "name": "Arrêté mensuel Janvier 2026",
    "snapshotDate": "2026-01-31T23:59:59.000Z"
  },
  "totalsDiff": {
    "initialAmount": 0,
    "revisedAmount": 5000,
    "forecastAmount": -2000,
    "committedAmount": 60000,
    "consumedAmount": 22000,
    "remainingAmount": -27000
  },
  "lineDiffs": [
    {
      "budgetLineId": "cmline001",
      "lineCode": "BL-INF-001",
      "lineName": "Licences Microsoft",
      "left": {
        "revisedAmount": 20000,
        "forecastAmount": 20000,
        "committedAmount": 0,
        "consumedAmount": 0,
        "remainingAmount": 20000
      },
      "right": {
        "revisedAmount": 22000,
        "forecastAmount": 21000,
        "committedAmount": 15000,
        "consumedAmount": 8000,
        "remainingAmount": -1000
      },
      "diff": {
        "revisedAmount": 2000,
        "forecastAmount": 1000,
        "committedAmount": 15000,
        "consumedAmount": 8000,
        "remainingAmount": -21000
      }
    }
  ]
}
```

Règles :

* les deux snapshots doivent appartenir au client actif
* ils doivent porter sur le même `budgetId`
* sinon `400 BadRequest`

---

# 7. DTOs backend

## CreateBudgetSnapshotDto

```ts
export class CreateBudgetSnapshotDto {
  @IsString()
  @IsNotEmpty()
  budgetId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsISO8601()
  snapshotDate?: string;
}
```

## QueryBudgetSnapshotsDto

```ts
export class QueryBudgetSnapshotsDto {
  @IsOptional()
  @IsString()
  budgetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
```

## CompareBudgetSnapshotsDto

```ts
export class CompareBudgetSnapshotsDto {
  @IsString()
  @IsNotEmpty()
  leftSnapshotId: string;

  @IsString()
  @IsNotEmpty()
  rightSnapshotId: string;
}
```

---

# 8. Logique de création

## 8.1 Algorithme

Lors de `POST /api/budget-snapshots` :

1. vérifier l’accès utilisateur
2. vérifier permissions `budgets.create`
3. charger le budget du client actif
4. charger l’exercice associé
5. charger toutes les enveloppes du budget
6. charger toutes les lignes du budget
7. calculer les totaux du snapshot à partir des lignes
8. créer le `BudgetSnapshot`
9. créer les `BudgetSnapshotLine`
10. écrire l’audit log
11. retourner le snapshot créé

## 8.2 Transaction

La création du snapshot doit être faite dans **une transaction Prisma unique** :

* soit tout est créé
* soit rien n’est écrit

## 8.3 Source des montants

Les montants figés proviennent des colonnes déjà présentes dans `BudgetLine` :

* `initialAmount`
* `revisedAmount`
* `forecastAmount`
* `committedAmount`
* `consumedAmount`
* `remainingAmount`

Le backend snapshot **ne recalcule pas** les montants ; il photographie l’état courant.

---

# 9. Comparaison de snapshots

## 9.1 Principe

La comparaison se fait par correspondance sur `budgetLineId`.

## 9.2 Cas à gérer

* ligne présente dans les deux snapshots
* ligne présente seulement dans le snapshot droit
* ligne présente seulement dans le snapshot gauche

Pour le MVP :

* une ligne absente d’un côté est traitée comme valeurs nulles / zéro selon le rendu API
* le backend renvoie explicitement `left`, `right`, `diff`

## 9.3 Intérêt métier

Cela permet de répondre à :

* quelles lignes ont le plus dérivé ?
* où le forecast a-t-il augmenté ?
* quelles lignes sont passées en surconsommation ?
* quels arbitrages ont modifié le budget ?

---

# 10. Audit logs

Chaque création de snapshot doit produire un audit log.

## 10.1 Événement

Proposition :

* `budget_snapshot.created`

## 10.2 Contenu minimal

* `clientId`
* `userId`
* `resourceType: budget_snapshot`
* `resourceId: <snapshotId>`
* métadonnées utiles :

  * `budgetId`
  * `snapshotDate`
  * `name`
  * `code`
  * nombre de lignes figées

Aucune modification ni suppression n’existant dans le MVP, aucun autre événement n’est requis.

---

# 11. Sécurité

## 11.1 Guards

Comme le reste du module budget :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

## 11.2 Permissions par route

* `GET /api/budget-snapshots` → `budgets.read`
* `GET /api/budget-snapshots/:id` → `budgets.read`
* `GET /api/budget-snapshots/compare` → `budgets.read`
* `POST /api/budget-snapshots` → `budgets.create`

## 11.3 Contraintes

* jamais de `clientId` depuis le frontend
* jamais de lecture cross-client
* jamais de comparaison cross-client
* jamais de comparaison entre deux budgets différents

---

# 12. Structure backend

Nouveau module :

```text
apps/api/src/modules/budget-snapshots/
  budget-snapshots.module.ts
  budget-snapshots.controller.ts
  budget-snapshots.service.ts
  dto/
    create-budget-snapshot.dto.ts
    query-budget-snapshots.dto.ts
    compare-budget-snapshots.dto.ts
```

Le module dépend de :

* `PrismaModule`
* `AuditLogsModule`

Pas de dépendance circulaire avec `financial-core`.

---

# 13. Tests attendus

## 13.1 Unit tests service

* crée un snapshot d’un budget valide
* refuse si budget introuvable
* refuse si budget hors client actif
* calcule correctement les totaux
* copie correctement les lignes
* crée un snapshot immuable
* compare deux snapshots du même budget
* refuse la comparaison de budgets différents

## 13.2 E2E / API tests

* `POST /api/budget-snapshots` avec succès
* `GET /api/budget-snapshots`
* `GET /api/budget-snapshots/:id`
* `GET /api/budget-snapshots/compare`
* 401 sans JWT
* 403 sans client actif valide
* 403 sans permission
* 400 si comparaison invalide

---

# 14. Hors périmètre

Cette RFC ne couvre pas encore :

* snapshot partiel par enveloppe
* snapshot avec détail des allocations
* snapshot avec détail des événements
* export PDF / Excel
* workflow de validation / approbation
* suppression logique / archivage avancé
* diff enrichi par enveloppe
* comparaison snapshot vs état live
* versionning automatique périodique

---

# 15. Critères d’acceptation

La RFC est considérée comme terminée si :

1. un utilisateur autorisé peut créer un snapshot d’un budget du client actif
2. le snapshot fige les lignes et montants à l’instant T
3. le snapshot reste lisible même si le budget live évolue ensuite
4. les snapshots d’un budget peuvent être listés
5. un snapshot peut être lu avec ses lignes
6. deux snapshots d’un même budget peuvent être comparés
7. un audit log est écrit à la création
8. aucune modification ou suppression n’est possible via API
9. tout est strictement isolé par `clientId`

---

# 16. Résumé d’implémentation

En pratique, **RFC-015-3** ajoute :

* un modèle Prisma `BudgetSnapshot`
* un modèle Prisma `BudgetSnapshotLine`
* un module NestJS `budget-snapshots`
* un endpoint de création
* un endpoint de listing
* un endpoint de lecture
* un endpoint de comparaison
* de l’audit
* des tests

---

# 17. Recommandation de séquencement

Ordre conseillé :

* **RFC-015-3A** : Prisma + migration + service de snapshot
* **RFC-015-3B** : endpoints REST + audit + tests
* **RFC-015-3C** : comparaison enrichie + doc API


