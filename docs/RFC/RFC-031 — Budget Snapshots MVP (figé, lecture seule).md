# RFC-031 — Budget Snapshots (MVP propre)

## Statut

Draft

## Dépend de

* RFC-015-1A — Schéma Prisma Budget MVP
* RFC-015-2 — Budget Management Backend
* RFC-030 — Budget Forecast & Comparaison Budgétaire (normalisation `BudgetSnapshotsService.compare`)
* RFC-013 — Audit logs
* RFC-012 — Permissions / RBAC

## Relation avec RFC-015-3

* **RFC-015-3 — Snapshots budgétaires** décrit une vision plus large (budget, enveloppes, lignes, périmètre étendu).
* **RFC-031** cible un **MVP minimal** : snapshot au niveau **budget + lignes** avec montants figés, **sans versioning**, aligné sur les besoins immédiats (comparaison dans le temps, audit, crédibilité DAF). Les deux documents peuvent converger ultérieurement ; en attendant, l’implémentation suit **ce fichier** pour le périmètre MVP.

---

## Objectif

Permettre de :

* sauvegarder un budget à un instant T
* comparer dans le temps
* tracer qui a figé quoi et quand

**Sans** introduire de complexité inutile (**pas de versioning** dans ce périmètre).

---

## Positionnement (non négociable)

* Snapshot = **lecture seule**
* Snapshot = **figé**
* Snapshot ≠ version
* Snapshot ≠ modifiable

## Relation avec RFC-033 (vocabulaire produit)

* [RFC-033 — Mise en place des versions budgétaires (produit)](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) officialise le terme métier **« version figée »** : il désigne techniquement un **`BudgetSnapshot`** (copie immuable à une occasion donnée).
* La phrase « Snapshot ≠ version » ci-dessus vise à **éviter la confusion avec les révisions** du [RFC-019](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) (lignée de `Budget` éditables). En **interface utilisateur**, utiliser **« version figée »** ou **« photographie »** pour le snapshot, et **« révision »** / **« version de travail »** pour RFC-019 lorsque les deux concepts coexistent.

---

## Modèle Prisma

### Table principale

```prisma
model BudgetSnapshot {
  id            String   @id @default(cuid())
  clientId      String
  budgetId      String

  label         String?  // ex: "Avant arbitrage DG"
  description   String?

  createdAt     DateTime @default(now())
  createdBy     String   // userId

  lines         BudgetSnapshotLine[]

  @@index([clientId])
  @@index([budgetId])
}
```

### Lignes snapshot

```prisma
model BudgetSnapshotLine {
  id             String   @id @default(cuid())
  snapshotId     String

  lineId         String?  // nullable si supprimée ensuite
  code           String
  name           String

  revisedAmount  Decimal
  consumedAmount Decimal
  forecastAmount Decimal
  remainingAmount Decimal

  snapshot       BudgetSnapshot @relation(fields: [snapshotId], references: [id])

  @@index([snapshotId])
}
```

---

## Règles clés

### Snapshot = figé

* aucune modification possible après création
* pas de PATCH / DELETE ligne

### Données copiées (pas de référence live)

On copie :

* code
* name
* montants

On ne dépend **jamais** du live après snapshot.

### Cohérence

* snapshot = **photo complète**
* jamais partielle

---

## API

### 1. Créer un snapshot

**POST** `/api/budget-snapshots`

```json
{
  "budgetId": "uuid",
  "label": "Avant validation DAF",
  "description": "Optionnel"
}
```

**Comportement**

* récupère toutes les lignes du budget
* copie les montants
* crée snapshot + lignes

---

### 2. Lister snapshots

**GET** `/api/budget-snapshots?budgetId=xxx`

```json
{
  "items": [
    {
      "id": "uuid",
      "label": "Avant arbitrage",
      "createdAt": "...",
      "createdBy": "userId"
    }
  ],
  "total": 0
}
```

---

### 3. Détail snapshot

**GET** `/api/budget-snapshots/:id`

```json
{
  "id": "uuid",
  "budgetId": "uuid",
  "label": "...",
  "lines": [...]
}
```

---

### 4. Comparaison snapshot ↔ snapshot

Déjà existant → **`BudgetSnapshotsService.compare`**

À normaliser avec **RFC-030** (déjà engagé côté produit / API).

---

## Guards

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

```ts
@RequirePermissions('budgets.read')
```

(ajuster le nom de permission exact selon le référentiel permissions du projet, ex. `budgets.write` pour la création de snapshot si distinct.)

---

## Audit logs

### Actions

* `budget.snapshot.created`
* `budget.snapshot.viewed`

### Payload

* `resourceType` = `budget_snapshot`
* `resourceId` = `snapshotId`

---

## Service

### `BudgetSnapshotsService`

#### `createSnapshot(budgetId)`

* récupérer lignes budget
* mapper → snapshot lines
* transaction Prisma

---

## Tests

### Unit

* création snapshot
* montants copiés correctement

### Intégration

* isolation `clientId`
* snapshot complet
* compare snapshot OK

---

## UX attendue (minimum)

### Bouton

« Créer un snapshot »

### Liste

* date
* label
* user

### Timeline simple

* tri décroissant

---

## Points de vigilance

### Ne pas faire

* modifier un snapshot
* recalculer les données
* dépendre du live

### Toujours faire

* copier les données
* figer
* tracer user + date

---

## Résultat attendu

Débloque immédiatement :

* comparaison dans le temps
* audit
* crédibilité DAF

---

## Suite logique (hors MVP)

1. Versioning (voir RFC-019)
2. Comparaison avancée (alignée RFC-030)
3. Forecast intelligent

---

## Implémentation

Pour une passe d’implémentation dans le dépôt (fichiers NestJS, Prisma, tests) : utiliser le workflow projet (`/plancursor` ou équivalent) en pointant cette RFC comme source de vérité pour le périmètre MVP.
