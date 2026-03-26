# RFC-FOU-026 — Supplier Categories

## Statut

Draft

## Priorité

Haute

## État

⏳ À faire

## Dépendances

* RFC-025 — Procurement Core
* RFC-FOU-025-A — Supplier Core (Hardening & Alignment)
* Architecture technique Starium Orchestra 
* API / multi-client / guards / permissions 

---

# 1. Objectif

Introduire un référentiel **Supplier Categories** pour classifier les fournisseurs d’un client selon une lecture métier exploitable dans Starium Orchestra.

Exemples de catégories :

* Cloud
* Télécom
* ERP
* Cybersécurité
* Matériel
* Infogérance
* SaaS métier
* Conseil / Intégration

Cette RFC a pour but de :

* structurer le portefeuille fournisseurs
* améliorer les filtres et la recherche
* permettre des vues consolidées et des KPI par catégorie
* préparer les futurs cockpits procurement, finance et gouvernance

La catégorie fournisseur est un **référentiel métier configurable par client**, pas un simple libellé libre.

---

# 2. Problème adressé

Le référentiel fournisseur seul permet d’identifier les fournisseurs, mais pas de les **segmenter**.

Sans catégories :

* les listes fournisseurs restent plates
* les filtres sont limités
* les dashboards ne peuvent pas agréger par type de fournisseur
* les arbitrages sont moins lisibles
* les directions ne peuvent pas répondre rapidement à des questions comme :

  * combien de fournisseurs Cloud avons-nous ?
  * quelle part de nos fournisseurs relève de la cybersécurité ?
  * quels sont les fournisseurs ERP critiques ?

La catégorisation est donc nécessaire pour passer d’un simple registre à un **outil de pilotage**.

---

# 3. Positionnement produit

Supplier Categories est :

* un **référentiel maître secondaire**
* un axe de lecture **métier**
* un support de **tri, filtre, reporting et cockpit**

Ce n’est pas :

* un tag libre
* une taxonomie globale plateforme commune à tous les clients
* un système de classification multi-niveaux complexe

---

# 4. Périmètre

## Inclus

* modèle `SupplierCategory`
* CRUD backend du référentiel
* assignation d’une catégorie à un fournisseur
* filtres API par catégorie
* audit logs
* validations multi-tenant et unicité
* exposition des catégories dans les réponses fournisseur si utile au frontend

## Exclus du MVP

* hiérarchie de catégories
* multi-catégorisation d’un fournisseur
* scoring / criticité
* catégorisation automatique par IA
* synchronisation externe
* taxonomy globale plateforme
* règles d’héritage sur contrats / commandes / factures

---

# 5. Principes d’architecture

## 5.1 Multi-client strict

Chaque catégorie :

* appartient à un `clientId`
* n’est visible et modifiable que dans le client actif
* ne doit jamais être partagée entre clients

Toutes les routes passent par le pipeline métier standard :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```

conformément à l’architecture Starium.  

## 5.2 Backend source de vérité

Le backend contrôle :

* l’unicité
* la normalisation
* la cohérence d’assignation supplier ↔ category
* l’inactivation
* le filtrage

## 5.3 Simplicité MVP

Décision MVP :

* **1 fournisseur = 0 ou 1 catégorie**
* pas de hiérarchie
* pas de sous-catégorie
* pas de N:N

Cette contrainte garde le modèle simple et exploitable immédiatement.

---

# 6. Cas d’usage

## 6.1 Création de catégories par client

Un client admin crée ses catégories métier :

* Cloud
* Télécom
* ERP
* Sécurité
* Poste de travail
* Réseau

## 6.2 Assignation d’une catégorie à un fournisseur

Exemples :

* AWS → Cloud
* Orange → Télécom
* SAP → ERP
* Palo Alto → Cybersécurité

## 6.3 Filtrage de liste

L’utilisateur filtre les fournisseurs par catégorie.

## 6.4 Reporting

Le cockpit procurement peut produire :

* nombre de fournisseurs par catégorie
* montants PO / invoices par catégorie
* top catégories les plus représentées

---

# 7. Décisions métier

## 7.1 Une seule catégorie par fournisseur

Un fournisseur porte au plus une catégorie en MVP.

Pourquoi :

* interface plus simple
* filtres plus lisibles
* reporting plus stable
* pas de logique N:N prématurée

## 7.2 Catégorie facultative

Un fournisseur peut ne pas être catégorisé.

Cela permet :

* migration progressive
* création rapide sans blocage
* enrichissement ultérieur

## 7.3 Désactivation plutôt que suppression

Comme les autres référentiels Starium :

* pas de suppression physique en MVP
* désactivation logique via `isActive = false`

---

# 8. Modèle de données

## 8.1 Nouveau modèle Prisma

```prisma
model SupplierCategory {
  id             String   @id @default(cuid())
  clientId       String

  name           String
  normalizedName String
  code           String?

  color          String?
  icon           String?

  sortOrder      Int      @default(0)
  isActive       Boolean  @default(true)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  client         Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  suppliers      Supplier[]

  @@index([clientId])
  @@index([clientId, isActive])
  @@index([clientId, sortOrder])
  @@unique([clientId, normalizedName])
}
```

## 8.2 Extension du modèle Supplier

Ajouter dans `Supplier` :

```prisma
supplierCategoryId String?

supplierCategory   SupplierCategory? @relation(fields: [supplierCategoryId], references: [id], onDelete: SetNull)

@@index([supplierCategoryId])
@@index([clientId, supplierCategoryId])
```

## 8.3 Pourquoi `SetNull`

Si une catégorie est désactivée ou retirée à terme, le fournisseur doit rester exploitable.
La suppression physique n’est pas prévue en MVP, mais `SetNull` garde le modèle robuste.

---

# 9. Règles de gestion

## 9.1 Nom obligatoire

* `name` requis
* non vide après trim

## 9.2 Normalisation

Créer une fonction backend dédiée :

```text
normalizeSupplierCategoryName(name: string)
```

Règles :

* trim
* lowercase
* collapse spaces

Exemple :

```text
"  Cyber   Sécurité " → "cyber sécurité"
```

## 9.3 Unicité

Unicité par :

```text
(clientId, normalizedName)
```

Deux clients différents peuvent avoir une catégorie de même nom.

## 9.4 Code facultatif

`code` est optionnel, mais utile pour :

* exports
* mappings futurs
* affichage compact

Exemples :

* `CLOUD`
* `TELCO`
* `ERP`
* `SEC`

## 9.5 Désactivation

Si `isActive = false` :

* la catégorie reste lisible
* elle n’est plus assignable à de nouveaux fournisseurs
* les fournisseurs déjà rattachés restent historisés

## 9.6 Cohérence client

Lors d’une assignation :

* `Supplier.clientId` doit être identique à `SupplierCategory.clientId`

Toute incohérence doit être rejetée côté backend.

---

# 10. API backend

## 10.1 Routes

Nouveau contrôleur dédié :

```text
GET    /api/supplier-categories
POST   /api/supplier-categories
GET    /api/supplier-categories/:id
PATCH  /api/supplier-categories/:id
POST   /api/supplier-categories/:id/deactivate
```

## 10.2 Intégration supplier

L’assignation se fait via l’update fournisseur existant :

```text
PATCH /api/suppliers/:id
```

Body possible :

```json
{
  "supplierCategoryId": "cat_xxx"
}
```

## 10.3 Filtre fournisseurs

Étendre :

```text
GET /api/suppliers?supplierCategoryId=cat_xxx
```

## 10.4 Permissions

Pour le MVP, rester aligné sur le domaine `procurement.*` existant :

* `procurement.read`
* `procurement.create`
* `procurement.update`

Ne pas introduire `supplier_categories.*` tant que le module procurement reste le domaine d’exposition principal.

---

# 11. DTOs

## 11.1 CreateSupplierCategoryDto

```ts
export class CreateSupplierCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
```

## 11.2 UpdateSupplierCategoryDto

Tous les champs optionnels :

* `name?`
* `code?`
* `color?`
* `icon?`
* `sortOrder?`
* `isActive?` uniquement si tu ne veux pas de route dédiée de désactivation

## 11.3 Query DTO

```ts
search?: string;
isActive?: boolean;
offset?: number;
limit?: number;
```

---

# 12. Structure backend recommandée

Créer :

```text
apps/api/src/modules/procurement/supplier-categories/
├── supplier-categories.controller.ts
├── supplier-categories.service.ts
├── dto/
│   ├── create-supplier-category.dto.ts
│   ├── update-supplier-category.dto.ts
│   └── list-supplier-categories.query.dto.ts
└── tests/
```

Le module reste rattaché à `procurement.module.ts`.

---

# 13. Logique de service

## 13.1 create

Étapes :

1. normaliser `name`
2. vérifier doublon dans le client actif
3. créer la catégorie
4. auditer
5. retourner la catégorie

## 13.2 update

Étapes :

1. charger la catégorie par `id + clientId`
2. refuser si absente
3. recalculer `normalizedName` si `name` change
4. vérifier conflit d’unicité
5. mettre à jour
6. auditer

## 13.3 deactivate

Étapes :

1. charger la catégorie
2. si déjà inactive → idempotence possible
3. passer `isActive = false`
4. auditer

## 13.4 assignation supplier

L’assignation reste dans `SuppliersService.update(...)`.

Règles :

* si `supplierCategoryId` fourni :

  * charger la catégorie du client actif
  * refuser si inactive
  * refuser si autre client
* permettre aussi de passer `null` pour retirer la catégorie

---

# 14. Réponses API

## 14.1 Liste catégories

```json
{
  "items": [
    {
      "id": "cat_1",
      "name": "Cloud",
      "code": "CLOUD",
      "color": "#3B82F6",
      "icon": "cloud",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "2026-03-26T10:00:00.000Z",
      "updatedAt": "2026-03-26T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## 14.2 Supplier enrichi

Si le contrat API supplier est déjà enrichissable sans rupture, ajouter :

```json
{
  "id": "sup_1",
  "name": "AWS",
  "supplierCategoryId": "cat_1",
  "supplierCategory": {
    "id": "cat_1",
    "name": "Cloud",
    "code": "CLOUD"
  }
}
```

Sinon, garder la relation uniquement sur le détail fournisseur ou via option `includeCategory`.

Décision MVP recommandée : **ajout backward-compatible**.

---

# 15. Audit logs

Actions à créer :

* `supplier_category.created`
* `supplier_category.updated`
* `supplier_category.deactivated`
* `supplier.category_assigned`
* `supplier.category_removed`

Conformément aux conventions d’audit Starium (`<resource>.<action>`). 

Exemple :

```json
{
  "action": "supplier.category_assigned",
  "resourceType": "supplier",
  "resourceId": "sup_1",
  "newValue": {
    "supplierCategoryId": "cat_1",
    "supplierCategoryName": "Cloud"
  }
}
```

---

# 16. Tests attendus

## 16.1 Unit tests SupplierCategoriesService

* création valide
* conflit sur `normalizedName`
* update avec conflit
* désactivation
* idempotence désactivation si retenue
* recherche paginée / filtrée

## 16.2 Tests SuppliersService

* assignation d’une catégorie valide
* refus si catégorie d’un autre client
* refus si catégorie inactive
* retrait de catégorie via `null`

## 16.3 Intégration

* `GET /api/suppliers?supplierCategoryId=...`
* isolation client stricte
* filtres par catégorie
* aucune régression sur PurchaseOrder / Invoice

---

# 17. Impact frontend

Cette RFC prépare les évolutions suivantes :

* dropdown catégorie dans la fiche fournisseur
* filtres sur la liste fournisseurs
* badges catégorie dans les tables
* widgets cockpit par catégorie

Le frontend n’est pas dans le scope de cette RFC, mais le backend doit être prêt pour :

* `list supplier categories`
* `assign category to supplier`
* `filter suppliers by category`

---

# 18. Ordre d’implémentation recommandé

1. Prisma : `SupplierCategory` + relation `Supplier`
2. migration
3. service backend catégories
4. contrôleur backend catégories
5. extension `SuppliersService.update`
6. extension filtre `GET /api/suppliers`
7. tests unitaires
8. tests d’intégration
9. mise à jour `docs/API.md` plus tard

---

# 19. Critères de succès

La RFC est considérée comme réussie si :

* une catégorie peut être créée, lue, modifiée, désactivée
* un fournisseur peut être rattaché à une catégorie
* aucun doublon de catégorie n’est possible dans un même client
* un fournisseur ne peut pas être lié à une catégorie d’un autre client
* le filtre fournisseurs par catégorie fonctionne
* les audits sont écrits
* aucune régression n’apparaît sur procurement core

---

# 20. Décision finale

Supplier Categories apporte le **premier niveau de segmentation métier** du portefeuille fournisseurs.

Cette RFC permet de passer :

> d’un registre fournisseur exploitable
> à un portefeuille fournisseur **triable, filtrable et pilotable**
