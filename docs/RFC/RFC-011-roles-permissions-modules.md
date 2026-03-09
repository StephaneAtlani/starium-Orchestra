## RFC-011 — Gestion des rôles, permissions et accès modules

## Statut
À concevoir

## Référence
US-011

## Titre
Gestion des rôles, des permissions et de l’activation des modules

---

## 1. Contexte

Starium Orchestra est une plateforme SaaS **multi-client** et **multi-organisation**, utilisée notamment par des DSI à temps partagé qui gèrent plusieurs clients depuis un même compte.

Les RFC existantes ont posé :

- l’authentification (`RFC-002 — Authentification utilisateur`)
- la gestion des utilisateurs côté client (`RFC-008 — Gestion des utilisateurs`)
- la gestion des clients et du rôle `Platform Admin` (`RFC-009 — Gestion des clients`)
- la notion de **client actif** et du `ActiveClientGuard` (`RFC-010 — Sélection du client actif`)

Il manque encore un socle clair pour :

- activer / désactiver des **modules métier** par client (périmètre fonctionnel vendu)
- gérer des **rôles métier** et des **permissions fines** à l’intérieur des modules activés
- sécuriser les endpoints par **module** + **permission** dans le contexte du **client actif**

Cette RFC définit ce modèle de sécurité en **2 étages** :

```text
Platform Admin
    ↓
Activation des modules par client

Client Admin
    ↓
RBAC interne (rôles métier + permissions fines)
```

et décrit l’architecture backend cible (guards, décorateurs, endpoints, modèle Prisma).

---

## 2. Objectif

Mettre en place un modèle de sécurité modulaire et multi-tenant permettant :

- au **Platform Admin** de contrôler **quels modules** sont disponibles pour chaque client
- au **Client Admin** de contrôler **qui a accès à quoi** à l’intérieur de ces modules, via des rôles et des permissions fines

Objectif précis :

- formaliser la **gestion des modules** (`Module`, `ClientModule`)
- formaliser le **RBAC métier client** (`Role`, `Permission`, `RolePermission`, `UserRole`)
- définir les **endpoints** côté plateforme et côté client
- définir le **pipeline de sécurité** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- fixer une **convention de nommage** des permissions
- poser les **critères d’acceptation** et l’**ordre d’implémentation**

Portée :

- spécification fonctionnelle et technique
- **aucune implémentation directe** dans cette RFC

---

## 3. Architecture des accès

### 3.1 Niveau plateforme — Platform Admin

Porté par `User.platformRole` (déjà introduit en `RFC-009`).

Rôles plateforme :

- `PLATFORM_ADMIN`
- `null` (utilisateur sans droits plateforme)

Un `PLATFORM_ADMIN` peut :

- gérer les **clients** (`/api/clients/*`)
- gérer les **utilisateurs plateforme** (RFC ultérieure)
- **activer / désactiver les modules** pour un client (objet de cette RFC)

Les routes plateforme sont protégées par :

- `JwtAuthGuard`
- `PlatformAdminGuard`

Pas de `ActiveClientGuard` ici (les routes plateforme ne sont pas multi-tenant au sens client-actif).

---

### 3.2 Niveau client — appartenance client

Porté par `ClientUser.role` (déjà décrit dans `RFC-008` et `RFC-010`).

Rôles d’appartenance :

- `CLIENT_ADMIN`
- `CLIENT_USER`

Ils déterminent :

- la capacité à **administrer le client** (`CLIENT_ADMIN`)
- la simple appartenance au client (`CLIENT_USER`)

Ces rôles sont utilisés par :

- `ActiveClientGuard` (contexte client actif)
- `ClientAdminGuard` (protection des routes d’administration de l’organisation)

---

### 3.3 Niveau client — RBAC métier (rôles & permissions)

Porté par les tables :

- `Role` (rôle métier client)
- `Permission` (permission unitaire, globale plateforme)
- `RolePermission` (liaison rôle ↔ permission)
- `UserRole` (liaison utilisateur ↔ rôle dans un client)

Ces éléments permettent :

- au **Client Admin** de définir des **rôles métier** (ex. `Responsable budgets`, `Chef de projet`)
- d’y associer des **permissions** fines (ex. `budgets.read`, `projects.update`)
- d’assigner un ou plusieurs rôles aux utilisateurs de son client

Logique produit :

- **Platform Admin** : scope = *quels modules sont accessibles pour ce client ?*
- **Client Admin** : scope = *qui fait quoi dans les modules activés ?*

---

## 4. Gestion des modules

### 4.1 Table `Module` — catalogue global

`Module` représente le **catalogue global** des modules disponibles dans Starium Orchestra.

Exemples de codes :

- `budgets`
- `projects`
- `contracts`
- `suppliers`
- `licenses`
- `teams`
- `applications`
- `documents`

Un module peut être globalement actif / inactif côté plateforme (feature flag produit).

---

### 4.2 Table `ClientModule` — activation par client

`ClientModule` représente l’**activation d’un module pour un client** donné.

Règle fondamentale :

> **Un module désactivé pour un client rend tous les endpoints associés interdits pour ce client.**

Corollaires :

- le frontend ne doit **pas** décider seul de l’accès
- les endpoints métier doivent **refuser** les requêtes si :
  - le module n’est pas activé pour le client actif
  - ou si le module est explicitement désactivé

Cette règle est appliquée par un `ModuleAccessGuard` dans le pipeline de sécurité.

---

## 5. Modèle de données (Prisma cible)

Le modèle s’appuie sur les modèles existants :

- `User`, `Client`, `ClientUser` (voir `RFC-008`, `RFC-009`, `RFC-010`)

### 5.1 Module

```prisma
model Module {
  id            String        @id @default(cuid())
  code          String        @unique
  name          String
  description   String?
  isActive      Boolean       @default(true) // activation globale dans le catalogue
  permissions   Permission[]
  clientModules ClientModule[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

---

### 5.2 ClientModule

```prisma
model ClientModule {
  id        String              @id @default(cuid())
  clientId  String
  moduleId  String
  status    ClientModuleStatus  @default(ENABLED)
  client    Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  module    Module              @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  @@unique([clientId, moduleId])
  @@index([clientId])
  @@index([moduleId])
}

enum ClientModuleStatus {
  ENABLED
  DISABLED
}
```

---

### 5.3 Role

```prisma
model Role {
  id             String          @id @default(cuid())
  clientId       String
  name           String
  description    String?
  isSystem       Boolean         @default(false)
  client         Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  rolePermissions RolePermission[]
  userRoles      UserRole[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([clientId, name])
  @@index([clientId])
}
```

---

### 5.4 Permission

```prisma
model Permission {
  id             String          @id @default(cuid())
  code           String          @unique
  label          String
  description    String?
  moduleId       String
  module         Module          @relation(fields: [moduleId], references: [id], onDelete: Restrict)
  rolePermissions RolePermission[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([moduleId])
}
```

Notes :

- `Permission` est **globale plateforme** (non scopée par client).
- le lien au client se fait via `Role` (qui porte `clientId`) et `RolePermission`.

---

### 5.5 RolePermission

```prisma
model RolePermission {
  id           String      @id @default(cuid())
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
}
```

---

### 5.6 UserRole

```prisma
model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  clientId  String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@index([clientId])
}
```

Contraintes métier :

- `UserRole.clientId` doit toujours être égal à `Role.clientId`
- la création / mise à jour d’un `UserRole` doit vérifier cette cohérence

---

## 6. Permissions

### 6.1 Convention de nommage

Toutes les permissions suivent la convention :

```text
<module>.<action>
```

Exemples :

- Budgets : `budgets.read`, `budgets.create`, `budgets.update`, `budgets.delete`
- Projects : `projects.read`, `projects.create`, `projects.update`, `projects.delete`
- Contracts : `contracts.read`, `contracts.create`, `contracts.update`, `contracts.delete`
- Users / rôles :
  - `users.read`, `users.create`, `users.update`, `users.delete`
  - `roles.read`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign`

Objectifs :

- éviter le **chaos des permissions** dans le temps
- rendre les règles de sécurité **lisibles** côté code et côté produit
- permettre un filtrage simple par module (`WHERE module.code = 'budgets'`)

---

### 6.2 Table `Permission` et seed

La plateforme doit fournir un **seed** cohérent de la table `Permission`, par exemple dans un script `prisma/seed.ts` :

- création du catalogue de `Module`
- création des permissions génériques par module

Cela garantit :

- une base homogène pour tous les clients
- la possibilité d’ajouter des permissions ultérieurement sans casser l’existant

---

## 7. Architecture backend (guards / decorators)

### 7.1 Pipeline de sécurité

Pour les routes **métier multi-tenant** (scopées par client), le pipeline obligatoire devient :

```text
JwtAuthGuard
↓
ActiveClientGuard
↓
ModuleAccessGuard
↓
PermissionsGuard
↓
Controller
```

Rôle de chaque guard :

- `JwtAuthGuard` : authentifie l’utilisateur via JWT (`userId`)
- `ActiveClientGuard` : valide le **client actif** (voir RFC-010) et injecte `request.activeClient`
- `ModuleAccessGuard` : vérifie que le **module du endpoint** est activé pour le client actif
- `PermissionsGuard` : vérifie que l’utilisateur possède la **permission requise** via ses rôles (`UserRole` → `Role` → `RolePermission` → `Permission`)

Les validations de sécurité restent **dans les guards**, pas dans les services métier.

---

### 7.2 ModuleAccessGuard

Responsabilité :

- lire le **code module** associé au contrôleur / route (ex. décorateur `@ModuleCode('budgets')` ou mapping interne)
- récupérer le `clientId` depuis `request.activeClient.id`
- vérifier qu’il existe un `ClientModule` avec :
  - `clientId = activeClient.id`
  - `Module.code = <moduleCode>`
  - `status = ENABLED`

En cas d’échec :

- renvoyer `403 Forbidden` (module non disponible pour ce client)

Ce guard garantit :

- qu’un module **désactivé** bloque automatiquement **tous les endpoints associés**
- que le backend reste **source de vérité** sur le périmètre fonctionnel par client

---

### 7.3 PermissionsGuard

Responsabilité :

1. Récupérer l’utilisateur connecté (`request.user` issu de `JwtAuthGuard`)
2. Récupérer le client actif (`request.activeClient`)
3. Charger les rôles utilisateur sur ce client (`UserRole` pour `(userId, clientId)`)
4. Agréger les permissions via `RolePermission` → `Permission`
5. Vérifier qu’au moins une des permissions requises est présente

Exemple d’usage :

```ts
@RequirePermissions('budgets.read')
@Get()
findAllBudgets() { /* ... */ }
```

ou pour plusieurs permissions :

```ts
@RequirePermissions('budgets.update', 'budgets.create')
```

---

### 7.4 @RequirePermissions()

Décorateur déclaratif permettant de définir les permissions nécessaires au niveau :

- d’un **contrôleur** (par défaut pour toutes les routes)
- d’une **méthode** (surcharge / précision)

Signature :

```ts
@RequirePermissions(...permissions: string[])
```

Le décorateur stocke les permissions attendues dans les **metadata** du handler (via `Reflector`) pour que `PermissionsGuard` les lise.

---

### 7.5 Règle spéciale Client Admin

Deux options ont été envisagées :

- **Option A** — `CLIENT_ADMIN` a **tous les droits** dans son client (court-circuit du RBAC)
- **Option B** — `CLIENT_ADMIN` reste soumis aux permissions fines (`Role` + `Permission`)

Recommandation initiale pour Starium Orchestra :

- implémenter **Option A** :
  - plus simple à mettre en place
  - robuste pour un premier niveau de sécurité
  - cohérent avec son rôle d’administrateur du client

Concrètement :

- si `request.activeClient.role === CLIENT_ADMIN`, `PermissionsGuard` peut considérer toutes les permissions comme accordées (après vérification de `ModuleAccessGuard`).

Cette décision pourra être revue ultérieurement (RFC dédiée) si un niveau de granularité supplémentaire est nécessaire.

---

## 8. Endpoints

### 8.1 Endpoints plateforme — modules client

Routes protégées par :

- `JwtAuthGuard`
- `PlatformAdminGuard`

#### 8.1.1 GET `/api/modules`

Liste le **catalogue global** des modules.

Réponse (exemple) :

```json
[
  {
    "code": "budgets",
    "name": "Budgets",
    "description": "Gestion des budgets IT",
    "isActive": true
  }
]
```

---

#### 8.1.2 GET `/api/clients/:clientId/modules`

Liste les modules et leur **statut** pour un client donné.

Réponse (exemple) :

```json
[
  {
    "code": "budgets",
    "name": "Budgets",
    "status": "ENABLED"
  },
  {
    "code": "projects",
    "name": "Projets",
    "status": "DISABLED"
  }
]
```

---

#### 8.1.3 POST `/api/clients/:clientId/modules`

Active un module pour un client (création ou mise à jour implicite).

Body :

```json
{
  "moduleCode": "budgets"
}
```

Règles :

- si `ClientModule` n’existe pas → création avec `status = ENABLED`
- si `ClientModule` existe déjà → mise à jour vers `status = ENABLED`

---

#### 8.1.4 PATCH `/api/clients/:clientId/modules/:moduleCode`

Change le statut d’un module pour un client.

Body :

```json
{
  "status": "DISABLED"
}
```

Règles :

- `status` ∈ `["ENABLED", "DISABLED"]`
- si le module est passé à `DISABLED`, tous les endpoints du module doivent être refusés par `ModuleAccessGuard` pour ce client

---

### 8.2 Endpoints client — rôles

Routes protégées par :

- `JwtAuthGuard`
- `ActiveClientGuard`
- `ClientAdminGuard`

#### 8.2.1 GET `/api/roles`

Liste les rôles du **client actif**.

#### 8.2.2 POST `/api/roles`

Crée un rôle pour le **client actif**.

Body :

```json
{
  "name": "Responsable budgets",
  "description": "Peut consulter et modifier les budgets"
}
```

Contrainte :

- unicité `(clientId, name)`

#### 8.2.3 GET `/api/roles/:id`

Retourne le détail d’un rôle, idéalement avec ses permissions associées.

#### 8.2.4 PATCH `/api/roles/:id`

Met à jour le rôle (name, description).

#### 8.2.5 DELETE `/api/roles/:id`

Supprime un rôle.

Règles :

- impossible de supprimer un rôle `isSystem = true`
- optionnellement : impossible de supprimer un rôle encore assigné (`UserRole` existants), ou alors imposer une règle métier explicite (hors périmètre minimal).

---

### 8.3 Endpoints client — permissions

#### 8.3.1 GET `/api/permissions`

Liste les permissions **disponibles pour le client actif**.

Comportement :

- ne retourner que les permissions appartenant à des modules :
  - **globablement actifs** (`Module.isActive = true`)
  - **activés** pour le client (`ClientModule.status = ENABLED`)

Option :

- groupement par module dans la réponse pour simplifier le frontend.

---

#### 8.3.2 PUT `/api/roles/:id/permissions`

Remplace **la liste des permissions** d’un rôle.

Body :

```json
{
  "permissionIds": [
    "perm_1",
    "perm_2",
    "perm_3"
  ]
}
```

Règles :

- toutes les permissions doivent appartenir à des modules :
  - globalement actifs (`Module.isActive = true`)
  - activés pour le client actif (`ClientModule.status = ENABLED`)
- sinon : `400 Bad Request`

---

### 8.4 Endpoints client — assignation des rôles aux utilisateurs

#### 8.4.1 GET `/api/users/:id/roles`

Liste les rôles d’un utilisateur dans le **client actif**.

#### 8.4.2 PUT `/api/users/:id/roles`

Remplace la liste des rôles d’un utilisateur dans le **client actif**.

Body :

```json
{
  "roleIds": [
    "role_1",
    "role_2"
  ]
}
```

Règles :

- l’utilisateur doit être rattaché au **client actif** (`ClientUser` valide)
- les rôles doivent appartenir au **client actif** (`Role.clientId = activeClient.id`)
- en cas de violation → `404` ou `400` selon le cas :
  - utilisateur non rattaché : `404`
  - rôle ne correspondant pas au client actif : `400`

---

## 9. Règles métier

### 9.1 Module désactivé

- si un module n’est **pas activé** pour un client (`ClientModule` absent ou `status = DISABLED`) :
  - aucun endpoint rattaché à ce module ne doit être accessible
  - aucune permission de ce module ne doit être proposée au Client Admin
  - les tentatives d’utilisation de permissions de ce module doivent être refusées (`400` ou `403`)

Cette règle est appliquée :

- par `ModuleAccessGuard` pour les endpoints
- par les services des endpoints `/api/permissions` / `/api/roles/:id/permissions` pour la composition de rôles

---

### 9.2 Client Admin

Un `CLIENT_ADMIN` peut :

- voir les **modules activés** pour son client
- créer, modifier, supprimer des **rôles métier**
- associer des **permissions** à ces rôles (dans les modules activés)
- assigner des **rôles** aux utilisateurs de son client

Il ne peut pas :

- activer des modules (réservé au Platform Admin)
- gérer des données d’un autre client

---

### 9.3 Sécurité / multi-client

Rappels :

- toutes les opérations se font dans le **contexte du client actif** (voir `RFC-010`)
- aucune **permission d’un autre client** ne doit fuiter
- les contrôleurs / services ne doivent **jamais** utiliser un `clientId` provenant du body / query params / URL comme scope principal
- les filtrages Prisma doivent utiliser `request.activeClient.id` comme **source de vérité** pour `clientId`

---

## 10. Critères d’acceptation

La fonctionnalité de cette RFC est considérée comme respectée lorsque :

- un **Platform Admin** peut :
  - consulter le catalogue global des modules (`GET /api/modules`)
  - activer / désactiver des modules pour un client (`/api/clients/:clientId/modules*`)
- un **Client Admin** peut :
  - voir les modules activés pour son client
  - créer, modifier, supprimer des rôles de son client
  - assigner des permissions à un rôle (uniquement depuis des modules activés)
  - assigner un ou plusieurs rôles à un utilisateur de son client
- un **utilisateur** ne peut accéder à une fonctionnalité que si :
  - le module est **activé** pour son client
  - la permission correspondante lui est accordée (ou qu’il est `CLIENT_ADMIN` si Option A est retenue)
- un **module désactivé** entraîne :
  - refus d’accès à tous les endpoints du module pour ce client
  - non-disponibilité des permissions de ce module dans les écrans de gestion des rôles
- il n’y a **aucune fuite inter-client** :
  - un utilisateur ne peut jamais voir des rôles / permissions / activations d’un autre client
- le **backend** reste **source de vérité** :
  - le frontend ne prend pas de décision de sécurité sans confirmation explicite de l’API

---

## 11. Ordre d’implémentation recommandé

### Lot 1 — Catalogue de modules

- ajouter les modèles Prisma :
  - `Module`
  - `ClientModule`
  - `ClientModuleStatus`
- créer le seed du **catalogue de modules**
- implémenter les endpoints plateforme :
  - `GET /api/modules`
  - `GET /api/clients/:clientId/modules`
  - `POST /api/clients/:clientId/modules`
  - `PATCH /api/clients/:clientId/modules/:moduleCode`

---

### Lot 2 — RBAC métier

- ajouter les modèles Prisma :
  - `Role`
  - `Permission`
  - `RolePermission`
  - `UserRole`
- créer le seed des **permissions globales**
- implémenter les endpoints côté client :
  - `GET /api/roles`
  - `POST /api/roles`
  - `GET /api/roles/:id`
  - `PATCH /api/roles/:id`
  - `DELETE /api/roles/:id`
  - `GET /api/permissions` (filtrage par modules activés)
  - `PUT /api/roles/:id/permissions`
  - `GET /api/users/:id/roles`
  - `PUT /api/users/:id/roles`

---

### Lot 3 — Sécurité et guards

- implémenter `ModuleAccessGuard` :
  - intégration dans le pipeline des modules métier (`JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard`)
- implémenter `PermissionsGuard` + décorateur `@RequirePermissions()`
- sécuriser au moins un premier module métier (`budgets`, `projects`, etc.) pour valider l’architecture complète :
  - vérification module activé
  - vérification permissions
  - comportement spécifique pour `CLIENT_ADMIN` (Option A)

---

Cette RFC s’appuie explicitement sur :

- `RFC-002 — Authentification utilisateur`
- `RFC-008 — Gestion des utilisateurs`
- `RFC-009 — Gestion des clients`
- `RFC-010 — Sélection du client actif`

et étend l’architecture pour couvrir la **gestion des rôles, permissions et accès modules** dans un contexte **SaaS multi-client**.

