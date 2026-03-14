# RFC-019 — Budget Versioning

## Statut

Draft

## Références

* RFC-015-2 — Budget Management Backend
* RFC-015-1B — Financial Core Backend
* RFC-015-3 — Budget Snapshots
* RFC-016 — Budget Reporting API
* RFC-017 — Budget Reallocation
* RFC-018 — Budget Import / Export

---

## 1. Objectif

Permettre de gérer, pour un même budget métier, plusieurs **versions successives** :

* une **baseline**
* des **révisions**
* une **version active**
* un **historique lisible et auditable**

Le besoin est de distinguer clairement :

* le budget de référence
* les révisions officielles
* la version actuellement pilotée
* les écarts entre versions

Cette RFC ne remplace pas les snapshots.
Le **snapshot** fige une photo à un instant T.
Le **versioning** gère la lignée métier des budgets dans le temps.

---

## 2. Principes fonctionnels

### 2.1 Ce que fait cette RFC

Cette RFC permet de :

* créer une **baseline** à partir d’un budget existant
* créer une **nouvelle version** par duplication d’une version source
* marquer une version comme **active**
* conserver la **filiation** entre versions
* comparer deux versions d’un même budget métier
* tracer les opérations dans les audit logs

### 2.2 Ce que cette RFC ne fait pas

Cette RFC ne gère pas :

* les snapshots immuables
* les workflows d’approbation
* la suppression physique
* le clonage des allocations ou événements financiers
* la comparaison entre budgets de familles différentes

---

## 3. Concepts métier

### 3.1 Version set

Un **Budget Version Set** représente une même famille budgétaire.

Exemple :

* Budget IT 2026 — V1 baseline
* Budget IT 2026 — V2 révision T1
* Budget IT 2026 — V3 révision T2

Toutes ces versions appartiennent au même ensemble.

### 3.2 Baseline

La **baseline** est la version de référence initiale.

Règles :

* une seule baseline par ensemble
* c’est la première version officielle
* elle reste lisible en permanence
* elle peut être comparée à toute révision

### 3.3 Révision

Une **révision** est une nouvelle version issue d’une version précédente.

Règles :

* elle a toujours un parent logique
* elle n’écrase jamais la version source
* elle peut devenir la version active

### 3.4 Version active

La **version active** est celle utilisée par défaut pour le pilotage courant.

Règles :

* une seule version active par ensemble
* le reporting et les écrans métier utilisent par défaut cette version si aucune autre n’est explicitement demandée

---

## 4. Décision d’architecture

Le versioning est porté par l’entité **Budget**.

Chaque version possède sa propre structure :

* `Budget`
* `BudgetEnvelope`
* `BudgetLine`

Cette décision est cohérente avec l’architecture actuelle où la structure budgétaire est indépendante du noyau financier, et où les lignes portent déjà les montants consolidés utiles au pilotage (`initialAmount`, `revisedAmount`, `forecastAmount`, `committedAmount`, `consumedAmount`, `remainingAmount`).

Conséquence : une nouvelle version est créée par **duplication de la structure budgétaire**.

---

## 5. Modèle de données

### 5.1 Nouveaux enums Prisma

```prisma
enum BudgetVersionKind {
  BASELINE
  REVISION
}

enum BudgetVersionStatus {
  DRAFT
  ACTIVE
  SUPERSEDED
  ARCHIVED
}
```

### 5.2 Nouveau modèle `BudgetVersionSet`

```prisma
model BudgetVersionSet {
  id               String   @id @default(cuid())
  clientId         String
  exerciseId       String
  code             String
  name             String
  description      String?
  baselineBudgetId String?
  activeBudgetId   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  client           Client          @relation(fields: [clientId], references: [id])
  exercise         BudgetExercise  @relation(fields: [exerciseId], references: [id])
  budgets          Budget[]

  @@index([clientId])
  @@index([exerciseId])
  @@unique([clientId, code])
}
```

### 5.3 Extension du modèle `Budget`

```prisma
model Budget {
  // existant...
  versionSetId    String?
  versionNumber   Int?
  versionLabel    String?
  versionKind     BudgetVersionKind?
  versionStatus   BudgetVersionStatus?
  parentBudgetId  String?
  activatedAt     DateTime?
  archivedAt      DateTime?
  isVersioned     Boolean @default(false)

  versionSet      BudgetVersionSet? @relation(fields: [versionSetId], references: [id])
  parentBudget    Budget?           @relation("BudgetVersionParent", fields: [parentBudgetId], references: [id])
  childVersions   Budget[]          @relation("BudgetVersionParent")

  @@index([clientId, versionSetId])
  @@index([clientId, versionStatus])
  @@index([clientId, versionKind])
  @@unique([versionSetId, versionNumber])
}
```

---

## 6. Règles métier

### 6.1 Création d’une baseline

À partir d’un budget existant non versionné, le système crée :

* un `BudgetVersionSet`
* une nouvelle copie du budget source
* la baseline `V1`

Décision MVP :

* on **duplique** le budget source
* on ne transforme pas le budget existant en place

Pourquoi :

* moins risqué vis-à-vis du CRUD déjà en place
* plus clair pour l’audit
* plus simple à tester

### 6.2 Création d’une révision

Créer une révision depuis un budget versionné duplique :

* le `Budget`
* les `BudgetEnvelope`
* les `BudgetLine`

La hiérarchie des enveloppes doit être reconstruite proprement.
Les lignes doivent être rattachées aux nouvelles enveloppes.

### 6.3 Données clonées

Sont clonés sur les `BudgetLine` :

* `initialAmount`
* `revisedAmount`
* `forecastAmount`
* `committedAmount`
* `consumedAmount`
* `remainingAmount`

Cette règle est cohérente avec le modèle actuel dans lequel ces champs sont matérialisés sur la ligne budgétaire et recalculés côté noyau financier.

### 6.4 Données non clonées

Ne sont pas clonés en MVP :

* `FinancialAllocation`
* `FinancialEvent`

Pourquoi :

* ces données relèvent du noyau financier, pas de la structure budgétaire
* dupliquer l’historique transactionnel créerait des ambiguïtés comptables
* le besoin de versioning porte d’abord sur le budget de pilotage, pas sur le journal financier

### 6.5 Activation d’une version

Activer une version signifie :

* la passer en `ACTIVE`
* faire passer l’ancienne active en `SUPERSEDED`
* mettre à jour `BudgetVersionSet.activeBudgetId`

Règles :

* la version doit appartenir au même `clientId`
* elle doit appartenir au même ensemble
* elle ne doit pas être archivée
* une seule version active par ensemble

### 6.6 Archivage

Une version non active peut être archivée.

Règles :

* pas d’archivage de la version active
* pas de suppression physique en MVP
* une version archivée reste lisible mais non modifiable

### 6.7 Modification des versions

* `DRAFT` et `ACTIVE` peuvent être modifiées selon les règles standards du module budget
* `SUPERSEDED` et `ARCHIVED` deviennent en lecture seule

---

## 7. Contraintes d’intégrité

Le backend doit garantir :

* une seule baseline par `BudgetVersionSet`
* une seule version active par `BudgetVersionSet`
* `clientId` identique entre `BudgetVersionSet`, `Budget`, `BudgetEnvelope`, `BudgetLine`
* impossibilité de créer une révision depuis une version archivée
* impossibilité de comparer deux budgets de familles différentes
* impossibilité de réallouer entre deux versions différentes

Ces validations doivent rester côté backend, conformément au principe “backend source de vérité” du projet.

---

## 8. API backend

Toutes les routes suivent le pattern existant :

* `Authorization: Bearer <accessToken>`
* `X-Client-Id`
* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

avec permissions `budgets.read`, `budgets.create`, `budgets.update` selon le verbe HTTP.

### 8.1 GET `/api/budget-version-sets`

Liste les ensembles de versions du client actif.

Filtres :

* `exerciseId`
* `search`
* `offset`
* `limit`

### 8.2 GET `/api/budget-version-sets/:id`

Retourne le détail d’un ensemble :

* métadonnées
* baseline
* version active
* liste des versions triées par `versionNumber`

### 8.3 POST `/api/budgets/:id/create-baseline`

Crée une baseline versionnée depuis un budget existant.

Réponse type :

```json
{
  "versionSetId": "bvs_001",
  "budgetId": "bud_v1",
  "versionNumber": 1,
  "versionLabel": "V1",
  "versionKind": "BASELINE",
  "versionStatus": "ACTIVE"
}
```

### 8.4 POST `/api/budgets/:id/create-revision`

Crée une nouvelle révision.

Body optionnel :

```json
{
  "label": "Révision T2",
  "description": "Ajustement après arbitrage"
}
```

Réponse type :

```json
{
  "versionSetId": "bvs_001",
  "budgetId": "bud_v2",
  "versionNumber": 2,
  "versionLabel": "V2",
  "versionKind": "REVISION",
  "versionStatus": "DRAFT",
  "parentBudgetId": "bud_v1"
}
```

### 8.5 POST `/api/budgets/:id/activate-version`

Active une version.

### 8.6 POST `/api/budgets/:id/archive-version`

Archive une version non active.

### 8.7 GET `/api/budgets/:id/version-history`

Retourne l’historique complet de la lignée.

### 8.8 GET `/api/budgets/:id/compare?targetBudgetId=...`

Retourne un diff entre deux versions du même ensemble.

---

## 9. Comparaison entre versions

Le versioning permet une fonctionnalité de comparaison, mais ne s’y réduit pas.

### 9.1 Portée MVP

La comparaison porte sur :

* budget
* enveloppes
* lignes
* montants

### 9.2 Matching

Le matching se fait en priorité par :

1. `code`
2. à défaut, `name` + contexte logique

Recommandation forte :

* lors de la duplication, conserver les `code` des enveloppes et lignes
* générer uniquement de nouveaux `id`

C’est la meilleure base pour un diff fiable.

### 9.3 Diff retourné

Le diff doit exposer :

* objets ajoutés
* objets supprimés
* objets modifiés
* écarts de montants

Exemple :

```json
{
  "sourceBudgetId": "bud_v1",
  "targetBudgetId": "bud_v2",
  "lines": [
    {
      "code": "CLOUD",
      "source": { "revisedAmount": 100000 },
      "target": { "revisedAmount": 120000 },
      "delta": { "revisedAmount": 20000 }
    }
  ]
}
```

---

## 10. Audit logs

Toutes les opérations doivent être tracées :

* `budget_version_set.created`
* `budget_version.baseline_created`
* `budget_version.revision_created`
* `budget_version.activated`
* `budget_version.archived`

Cela reste cohérent avec le fait que les créations et mises à jour budgétaires sont déjà auditées dans le module budget existant.

---

## 11. Structure backend recommandée

Créer un module dédié :

```text
apps/api/src/modules/budget-versioning/
├── budget-versioning.module.ts
├── budget-versioning.controller.ts
├── budget-versioning.service.ts
├── dto/
│   ├── create-baseline.dto.ts
│   ├── create-revision.dto.ts
│   ├── activate-version.dto.ts
│   └── compare-budget-versions.query.dto.ts
├── types/
│   └── budget-versioning.types.ts
└── tests/
```

Cette organisation est alignée avec la structuration modulaire NestJS documentée dans l’architecture projet.

---

## 12. Algorithme de duplication

Le service métier doit :

1. charger le budget source
2. vérifier le scope client
3. créer le nouveau budget
4. cloner les enveloppes sans parent
5. reconstruire les relations `parentId`
6. cloner les lignes avec remapping des `envelopeId`
7. renseigner les métadonnées de version
8. écrire l’audit log

Le tout dans une **transaction Prisma**.

Maps temporaires recommandées :

* `oldEnvelopeId -> newEnvelopeId`
* `oldLineId -> newLineId` si nécessaire pour extensions futures

---

## 13. Impacts frontend

Le frontend doit rester thin et consommer les API. Il ne doit pas porter de logique métier critique, conformément à l’architecture définie.

Écrans / actions à prévoir :

* badge de version dans les listes budgets
* historique des versions
* action “Créer une révision”
* action “Activer cette version”
* écran de comparaison

Libellés conseillés :

* `Baseline`
* `V2`
* `Active`
* `Superseded`
* `Archived`

---

## 14. Décisions MVP

1. Le versioning porte sur `Budget`.
2. Chaque version duplique `Budget`, `BudgetEnvelope`, `BudgetLine`.
3. Les montants consolidés des lignes sont clonés.
4. Les allocations et événements financiers ne sont pas clonés.
5. Une seule version active par ensemble.
6. Pas de suppression physique.
7. Les versions `SUPERSEDED` et `ARCHIVED` sont en lecture seule.
8. La comparaison ne fonctionne qu’au sein d’un même `BudgetVersionSet`.

---

## 15. Bénéfices

Cette RFC apporte :

* une vraie gouvernance des révisions budgétaires
* une distinction nette entre baseline, version active et historique
* une base saine pour les futurs workflows d’approbation
* une lecture plus mature pour DAF, DSI et direction
* une cohérence forte avec le positionnement cockpit / gouvernance de Starium Orchestra

---

## 16. Résumé

RFC-019 introduit un mécanisme de **Budget Versioning** avec :

* un **BudgetVersionSet**
* une **baseline**
* des **révisions**
* une **version active**
* une **duplication transactionnelle de la structure budgétaire**
* une **comparaison entre versions**
* une **traçabilité complète**

---