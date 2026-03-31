# RFC-025-A — Supplier Core (Hardening & Alignment)

## Statut

Draft

## Priorité

Très haute

## Dépend de

* RFC-025 — Procurement Core
* RFC-013 — Audit logs 
* Architecture technique Starium Orchestra 
* API Starium Orchestra / pipeline guards / multi-client 
* RFC-FE-028 — Supplier UX

---

# 1. Objectif

Durcir et réaligner le référentiel **Supplier** existant pour en faire un **véritable référentiel maître fournisseur** dans Starium Orchestra.

Le module Supplier existe déjà dans le backend, le Prisma, le seed, les services procurement, et le frontend. Il supporte déjà :

* CRUD de base
* quick-create
* usage dans PurchaseOrder et Invoice
* audit logs
* recherche UI

Mais l’implémentation actuelle reste trop faible pour porter durablement la gouvernance procurement, car elle repose principalement sur le `name` et non sur une logique robuste d’identité fournisseur. On retrouve bien `Supplier`, `SupplierStatus`, les liens avec `PurchaseOrder` et `Invoice`, ainsi que les endpoints `/api/suppliers` et `/api/suppliers/quick-create` dans l’existant.

Cette RFC a pour but de :

* **ne pas recréer** le module Supplier
* **modifier l’existant**
* renforcer l’anti-doublon
* fiabiliser l’identité fournisseur
* rendre le quick-create sûr
* préparer l’import fournisseur et les futures liaisons projets / contrats / conformité

---

# 2. Constat

## 2.1 Existant déjà présent

Le schéma Prisma contient déjà :

* `model Supplier`
* `enum SupplierStatus`
* relations vers `PurchaseOrder`
* relations vers `Invoice`

avec aujourd’hui notamment :

* `name`
* `code?`
* `email?`
* `vatNumber?`
* `status`
* index et unicité sur `(clientId, name)` dans la migration procurement core.

Le module backend existe déjà dans :

```text
apps/api/src/modules/procurement/suppliers/
```

avec :

* `SuppliersController`
* `SuppliersService`
* DTOs `create`, `update`, `list`, `quick-create`

et les services `PurchaseOrdersService` / `InvoicesService` savent déjà :

* résoudre un `supplierId`
* faire un quick-create si seul `supplierName` est fourni
* refuser un fournisseur archivé.

Le frontend possède déjà :

* recherche fournisseur
* combobox
* quick-create
* hooks React Query
* intégration dans les dialogs facture / commande.

## 2.2 Limites actuelles

L’existant présente plusieurs faiblesses :

1. l’unicité est fondée sur `name` et non sur une identité normalisée ;
2. il n’existe pas de champ `normalizedName` ;
3. `externalId` n’existe pas dans le modèle ;
4. `vatNumber` est présent mais non utilisé comme vraie clé de rapprochement ;
5. le quick-create peut produire des référentiels propres techniquement mais faibles fonctionnellement ;
6. la qualité de donnée fournisseur n’est pas suffisante pour un futur import réexécutable ou une gouvernance forte.

---

# 3. Principe directeur

Le fournisseur doit devenir une **donnée maître**.

Cela implique :

* un fournisseur n’est pas un simple texte saisi dans une facture ;
* un fournisseur n’est pas uniquement une aide UX ;
* un fournisseur est une entité de référence stable et réutilisable ;
* `PurchaseOrder` et `Invoice` doivent continuer à dépendre de `Supplier`, pas l’inverse.

---

# 4. Périmètre

## Inclus

* évolution du modèle `Supplier`
* migration Prisma additive
* renforcement du service Supplier existant
* renforcement du quick-create
* nouvelle stratégie anti-doublon
* adaptation contrôlée de `PurchaseOrdersService` et `InvoicesService`
* conservation des routes existantes
* conservation de la compatibilité frontend existante autant que possible
* audit logs enrichis

## Exclus

* nouvelle entité SupplierCategory
* nouveau workflow fournisseur
* import fournisseur complet
* fusion automatique de doublons
* refonte UI complète
* suppression physique
* nouveau module hors procurement

---

# 5. Règles produit et architecture

## 5.1 Multi-tenant strict

Comme tout objet métier Starium :

* un `Supplier` appartient à un `clientId`
* toutes les requêtes passent par :

  * `JwtAuthGuard`
  * `ActiveClientGuard`
  * `ModuleAccessGuard`
  * `PermissionsGuard`
* `clientId` n’apparaît jamais dans les DTOs
* aucune lecture cross-client n’est autorisée.  

## 5.2 Backend source de vérité

Les validations critiques doivent rester côté backend :

* normalisation
* anti-doublon
* archivage
* réutilisation de fournisseur existant
* conflit entre identifiants

## 5.3 Compatibilité progressive

Cette RFC doit **durcir** l’existant sans casser brutalement :

* les routes `/api/suppliers` et `/api/suppliers/quick-create` restent inchangées ;
* les flux `supplierId OR supplierName` côté commandes/factures restent possibles à court terme ;
* le frontend existant continue à fonctionner, avec adaptation légère si nécessaire.

---

# 6. Modèle de données cible

## 6.1 Évolution du modèle `Supplier`

Modifier `Supplier` dans `apps/api/prisma/schema.prisma`.

### Champs conservés

* `id`
* `clientId`
* `name`
* `code?`
* `email?`
* `vatNumber?`
* `status`
* `createdAt`
* `updatedAt`

### Champs à ajouter

* `normalizedName String`
* `externalId String?`
* `phone String?`
* `website String?`
* `notes String?`

### Modèle cible

```prisma
model Supplier {
  id             String         @id @default(cuid())
  clientId       String

  name           String
  normalizedName String
  code           String?
  externalId     String?

  email          String?
  phone          String?
  website        String?
  vatNumber      String?
  notes          String?

  status         SupplierStatus @default(ACTIVE)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  client         Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  purchaseOrders PurchaseOrder[]
  invoices       Invoice[]

  @@index([clientId])
  @@index([clientId, status])
  @@index([clientId, vatNumber])
  @@index([clientId, externalId])
  @@unique([clientId, normalizedName])
}
```

## 6.2 Règles de migration

Migration additive obligatoire :

1. ajouter `normalizedName` nullable temporairement si nécessaire ;
2. backfill des valeurs existantes à partir de `name` ;
3. contrôler les collisions `normalizedName` par `(clientId, normalizedName)` ;
4. rendre `normalizedName` obligatoire ;
5. supprimer l’unicité `(clientId, name)` ;
6. créer l’unicité `(clientId, normalizedName)`.

Complément intégrité DB (migration SQL) :

* ajouter des contraintes uniques partielles par expression sur :
  * `(clientId, btrim(externalId))` quand `externalId` est non null / non vide ;
  * `(clientId, replace(upper(btrim(vatNumber)), ' ', ''))` quand `vatNumber` est non null / non vide ;
* échouer explicitement la migration si des doublons existent déjà sur ces clés normalisées ;
* ne faire ni fusion automatique, ni suppression automatique.

Ne pas supprimer les données existantes.

---

# 7. Normalisation

## 7.1 Règle de normalisation du nom

Créer une fonction unique backend :

```text
normalizeSupplierName(name: string): string
```

Règles :

* trim début / fin
* lowercase
* remplacement des espaces multiples par un espace unique

Exemple :

```text
"  Amazon   Web Services  " -> "amazon web services"
```

## 7.2 Règles complémentaires

* `vatNumber` : trim + uppercase + suppression des espaces internes
* `email` : trim + lowercase
* `website` : trim
* `externalId` : trim, sans transformation métier complexe

Le frontend peut conserver sa fonction de normalisation pour l’UX, mais le backend reste l’autorité. On voit déjà une normalisation frontend dans `normalize-supplier-name.ts`.

---

# 8. Stratégie anti-doublon

## 8.1 Ordre de priorité

Le matching fournisseur doit suivre cet ordre :

1. `externalId` si fourni
2. `vatNumber` si fourni
3. `normalizedName`

## 8.2 Règles métier

### Création standard

Rejeter la création si, dans le client actif :

* un autre supplier porte le même `externalId`
* ou le même `vatNumber`
* ou le même `normalizedName`

### Quick-create

Le quick-create doit :

* retourner l’existant si un match est trouvé ;
* ne créer un nouveau supplier que si aucun match n’existe.

### Update

Une mise à jour ne doit pas créer un conflit avec un autre supplier du même client.

## 8.3 Cas des fournisseurs archivés

* un supplier `ARCHIVED` reste visible en historique ;
* il ne doit pas être réutilisé silencieusement pour quick-create ;
* si un match exact existe mais est `ARCHIVED`, lever une erreur métier explicite.

---

# 9. Statuts

Le statut existant est conservé :

```prisma
enum SupplierStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

## Règles métier

* `ACTIVE` : sélectionnable et modifiable
* `INACTIVE` : non recommandé pour nouveaux usages, mais encore lisible
* `ARCHIVED` : non sélectionnable, non modifiable, lecture seule

## Décision

* `quickCreate` ne doit jamais retourner ni créer un supplier `ARCHIVED`
* `update` sur `ARCHIVED` reste interdit, comme déjà implémenté dans l’existant.

---

# 10. API

## 10.1 Routes conservées

Conserver :

```text
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/:id
PATCH  /api/suppliers/:id
POST   /api/suppliers/quick-create
POST   /api/suppliers/:id/archive
GET    /api/suppliers/:id/purchase-orders
GET    /api/suppliers/:id/invoices
```

Les routes `/api/suppliers/:id/purchase-orders` et `/api/suppliers/:id/invoices` existent déjà côté procurement.

## 10.2 Permissions

Deux options sont possibles dans l’existant :

### Option A — rester dans `procurement.*`

* `procurement.read`
* `procurement.create`
* `procurement.update`

### Option B — spécialiser en `suppliers.*`

* `suppliers.read`
* `suppliers.create`
* `suppliers.update`

### Décision MVP

Conserver l’existant **`procurement.*`** pour ne pas casser le modèle permissionnel actuel, puis spécialiser plus tard si besoin.

## 10.3 Contrat de réponse (backend actuel)

Le contrat de réponse `SupplierResponse` est enrichi en restant backward-compatible :

* champs historiques conservés (`id`, `clientId`, `name`, `code`, `siret`, `vatNumber`, `status`, `createdAt`, `updatedAt`) ;
* champs supplémentaires exposés (`externalId`, `email`, `phone`, `website`, `notes`) ;
* `normalizedName` reste interne backend et n’est pas exposé dans la réponse API.

---

# 11. DTOs

## 11.1 CreateSupplierDto

Ajouter :

* `externalId?`
* `phone?`
* `website?`
* `notes?`

## 11.2 QuickCreateSupplierDto

Rester minimal :

```ts
name: string;
vatNumber?: string;
externalId?: string;
email?: string;
```

## 11.3 UpdateSupplierDto

Tous les champs optionnels, mais interdits si archived.

---

# 12. Services backend

## 12.1 SuppliersService

Le service existe déjà et doit être modifié, pas recréé.

### Méthodes concernées

* `list`
* `create`
* `quickCreate`
* `update`
* `archive`
* `findById`

### Modifications requises

#### `create`

* normaliser toutes les clés
* vérifier conflit par `externalId`
* puis `vatNumber`
* puis `normalizedName`
* créer `normalizedName`

#### `quickCreate`

* même logique de matching
* retourner l’existant si trouvé
* refuser si archived
* journaliser `creationMode = QUICK_CREATE` dans l’audit

#### `update`

* recalculer `normalizedName` si `name` change
* vérifier conflits sur `externalId`, `vatNumber`, `normalizedName`

#### `archive`

* idempotence conservée
* audit conservé

## 12.2 PurchaseOrdersService et InvoicesService

Les deux services utilisent déjà :

* `supplierId`
* ou `supplierName` avec quick-create automatique.

### Règle conservée

Pour le MVP :

```text
supplierId OR supplierName
```

### Règle renforcée

Quand `supplierName` est utilisé :

* appeler `SuppliersService.quickCreate`
* appliquer la nouvelle logique de matching robuste
* ne jamais créer un doublon simple de casse / espaces / TVA

---

# 13. Audit logs

Le système d’audit existe déjà et les conventions sont déjà cadrées. 

## Actions à conserver / enrichir

* `supplier.created`
* `supplier.updated`
* `supplier.archived`

## Enrichissement recommandé de `newValue`

Ajouter selon cas :

* `name`
* `normalizedName`
* `externalId`
* `vatNumber`
* `status`
* `creationMode` (`STANDARD` ou `QUICK_CREATE`)

Les logs doivent rester créés dans les services, jamais dans les controllers. 

---

# 14. Frontend

## 14.1 Objectif

Le frontend existe déjà ; il doit être aligné sans refonte lourde.

## 14.2 Éléments déjà présents

* `SupplierSearchCombobox`
* `useQuickCreateSupplier`
* `useSuppliersDropdownQuery`
* `listSuppliers`
* intégration dans create-order-dialog et create-invoice-dialog

## 14.3 Ajustements attendus

* meilleure gestion des doublons exacts
* messages clairs si fournisseur archivé
* si un match exact existe, le sélectionner automatiquement
* quick-create ne doit pas proposer de recréer un fournisseur déjà trouvé

## 14.4 Compatibilité

Ne pas casser :

* `supplierName` dans les formulaires
* la sélection par nom
* les hooks React Query existants

---

# 15. Performance

## 15.1 Liste fournisseurs

Conserver pagination simple :

```json
{
  "items": [],
  "total": number,
  "limit": number,
  "offset": number
}
```

## 15.2 Recherche

Pour le MVP :

* recherche par `name`
* filtrage par `status`
* potentiellement `vatNumber`

## 15.3 Plus tard

Pourra évoluer vers :

* recherche unifiée sur `name`, `vatNumber`, `code`, `externalId`

---

# 16. Tests attendus

## 16.1 Unit tests SuppliersService

Ajouter / adapter :

* création avec `normalizedName`
* conflit sur `normalizedName`
* conflit sur `externalId`
* conflit sur `vatNumber`
* quickCreate retourne existant si match
* quickCreate refuse archived
* update recalcule `normalizedName`
* archive idempotent

## 16.2 Tests intégration procurement

Vérifier :

* PO avec `supplierName` ne crée pas de doublon de casse
* Invoice avec `supplierName` ne crée pas de doublon de casse
* `supplierId` d’un autre client refusé
* archived refusé

## 16.3 Frontend

Vérifier :

* sélection fournisseur depuis combobox
* validation au blur
* quick-create invalide les queries existantes
* pas de duplication visuelle après création

---

# 17. Ordre d’implémentation

1. modifier le schéma Prisma `Supplier`
2. créer migration additive + backfill `normalizedName`
3. adapter `SuppliersService`
4. adapter tests `SuppliersService`
5. adapter `PurchaseOrdersService` et `InvoicesService`
6. adapter tests procurement
7. ajuster frontend uniquement si nécessaire
8. mettre à jour `docs/API.md`
9. mettre à jour `RFC-025` en référence croisée si besoin

---

# 18. Critères de succès

La RFC est considérée comme réussie si :

* deux fournisseurs identiques par casse / espaces ne peuvent plus être créés ;
* `quick-create` retourne l’existant au lieu de recréer ;
* `externalId` et `vatNumber` sont pris en compte dans l’identité fournisseur ;
* PO et Invoice continuent à fonctionner ;
* aucun flux multi-tenant n’est cassé ;
* les audit logs restent cohérents ;
* le frontend actuel reste compatible.

---

# 19. Ce que cette RFC ne fait pas

Cette RFC ne traite pas :

* Supplier Categories
* import fournisseur complet
* fusion manuelle de doublons
* enrichissement SIREN/SIRET/API externe
* scoring / qualification fournisseur
* contacts multiples

---

# 20. Décision finale

Le module Supplier existant est conservé, mais il change de nature :

> il passe d’un **référentiel fonctionnel minimal** à un **référentiel maître robuste**, capable de porter durablement le flux procurement Starium.

---

# 21. État d’implémentation (Backend + Prisma + Tests)

Implémenté sur ce lot :

* schéma Prisma `Supplier` durci (`normalizedName`, `externalId`, `email`, `phone`, `website`, `notes`) ;
* migration SQL additive avec backfill, contrôle collisions et contraintes uniques cibles ;
* normalisation backend centralisée (`name`, `vatNumber`, `externalId`, `email`) ;
* matching anti-doublon déterministe (`externalId` > `vatNumber` > `normalizedName`) ;
* règles explicites `ARCHIVED`/`INACTIVE` appliquées dans `SuppliersService` ;
* intégration `PurchaseOrdersService` / `InvoicesService` conservée via `SuppliersService.quickCreate` ;
* tests unitaires et intégration procurement adaptés.
