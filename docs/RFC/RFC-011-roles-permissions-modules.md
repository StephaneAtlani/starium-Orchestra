## RFC-011 — Gestion des rôles, permissions et accès modules

## Statut
À valider

## Priorité
Critique

## User Story

### US-011 — Gestion des rôles
En tant que **CLIENT_ADMIN**  
je veux **définir des rôles**  
afin de **gérer les accès**.

### Extension plateforme
En tant que **PLATFORM_ADMIN**  
je veux **activer ou désactiver des modules pour un client**  
afin de **contrôler le périmètre fonctionnel disponible par organisation**.

---

## 1. Contexte

Starium Orchestra est une plateforme SaaS multi-client et multi-tenant.  
Le contrôle d’accès doit respecter deux niveaux :

1. **niveau plateforme** : quels modules sont disponibles pour un client  
2. **niveau client** : quels droits sont accordés aux utilisateurs de ce client

Le système doit permettre :
- d’activer des modules pour un client
- de créer des rôles métier dans un client
- d’associer des permissions à ces rôles
- d’assigner ces rôles aux utilisateurs du client

---

## 2. Objectif

Mettre en place un modèle de sécurité en **2 étages** :

### Niveau 1 — Contrôle plateforme
Le **PLATFORM_ADMIN** gère les modules activés pour chaque client.

Exemples :
- budgets
- projets
- fournisseurs
- contrats
- licences
- équipes
- référentiel IT
- documents

### Niveau 2 — Contrôle client
Le **CLIENT_ADMIN** gère :
- les rôles
- les permissions des rôles
- l’assignation des rôles aux collaborateurs

Un client ne peut utiliser que des permissions appartenant à des modules **activés pour lui**.

---

## 3. Architecture des accès

Le système repose sur 3 couches distinctes.

### 3.1 Rôle global plateforme
Porté par `User.platformRole`

Valeurs :
- `PLATFORM_ADMIN`
- `null`

Usage :
- accès aux routes d’administration plateforme
- gestion des modules par client

---

### 3.2 Rôle d’appartenance au client
Porté par `ClientUser.role`

Valeurs :
- `CLIENT_ADMIN`
- `CLIENT_USER`

Usage :
- appartenance à un client
- administration du client
- contrôle du client actif

---

### 3.3 Rôles métier RBAC
Portés par :
- `Role`
- `Permission`
- `RolePermission`
- `UserRole`

Usage :
- gestion fine des accès fonctionnels dans les modules activés

---

## 4. Gestion des modules

### 4.1 Principe
Un module peut être :

- actif globalement sur la plateforme
- activé ou désactivé pour un client donné

### 4.2 Règle centrale
Un module **désactivé pour un client** rend **inaccessibles** :
- les permissions associées
- les endpoints associés
- les fonctionnalités associées

---

## 5. Modèle de données

### 5.1 Module
Catalogue global des modules de la plateforme.

Champs :
- `id`
- `code`
- `name`
- `description`
- `isActive`
- `createdAt`
- `updatedAt`

Contraintes :
- `code` unique

Exemples :
- `budgets`
- `projects`
- `contracts`
- `suppliers`

---

### 5.2 ClientModule
Activation d’un module pour un client.

Champs :
- `id`
- `clientId`
- `moduleId`
- `status`
- `createdAt`
- `updatedAt`

Contraintes :
- unicité `(clientId, moduleId)`

Enum :
- `ENABLED`
- `DISABLED`

---

### 5.3 Role
Rôle métier défini dans un client.

Champs :
- `id`
- `clientId`
- `name`
- `description`
- `isSystem`
- `createdAt`
- `updatedAt`

Contraintes :
- unicité `(clientId, name)`

Exemples :
- Responsable budgets
- Chef de projet
- Responsable contrats

---

### 5.4 Permission
Permission unitaire globale.

Champs :
- `id`
- `code`
- `label`
- `description`
- `moduleId`
- `createdAt`
- `updatedAt`

Contraintes :
- `code` unique

Convention :
`<module>.<action>`

Exemples :
- `budgets.read`
- `budgets.create`
- `projects.update`
- `roles.assign`

---

### 5.5 RolePermission
Association N:N entre rôle et permission.

Champs :
- `id`
- `roleId`
- `permissionId`

Contraintes :
- unicité `(roleId, permissionId)`

---

### 5.6 UserRole
Association N:N entre utilisateur et rôle métier.

Champs :
- `id`
- `userId`
- `roleId`
- `createdAt`

Contraintes :
- unicité `(userId, roleId)`

Règle :
- le client du rôle est porté par `Role.clientId`
- l’utilisateur doit appartenir à ce client via `ClientUser`

---

## 6. Règles métier

### 6.1 Côté Platform Admin
Le **PLATFORM_ADMIN** peut :
- lire le catalogue global des modules
- activer un module pour un client
- désactiver un module pour un client
- consulter les modules activés d’un client

Le Platform Admin ne gère pas les rôles internes du client dans cette RFC.

---

### 6.2 Côté Client Admin
Le **CLIENT_ADMIN** peut :
- lister les rôles de son client
- créer un rôle
- modifier un rôle
- supprimer un rôle
- associer des permissions à un rôle
- assigner des rôles aux utilisateurs de son client

Il ne peut travailler que :
- dans le **client actif**
- avec les **modules activés** pour ce client

---

### 6.3 Permissions limitées aux modules activés
Un rôle ne peut recevoir que des permissions appartenant à des modules activés pour le client.

Exemple :
- si `contracts` est désactivé
- alors `contracts.read` et `contracts.update` sont interdites

---

### 6.4 Assignation des rôles
Lorsqu’un rôle est assigné à un utilisateur :
- le rôle doit appartenir au client actif
- l’utilisateur doit être rattaché au client actif
- sinon la requête est refusée

---

### 6.5 Rôles système
Un rôle marqué `isSystem = true` :
- ne peut pas être supprimé
- peut éventuellement être protégé sur certaines modifications
- est créé automatiquement lors de la création d’un client pour le socle RBAC initial :
  - `Chef de projet`
  - `Contributeur Budgets`
  - `Directeur`
  - `Gestionnaire Procurement`
  - `Responsable Budgets`
  - `Resource Manager`
  - `Resource Viewer`

---

## 7. Architecture backend cible

### 7.1 Guards
Chaîne cible de sécurité :

`JwtAuthGuard`  
→ `ActiveClientGuard`  
→ `ModuleAccessGuard`  
→ `PermissionsGuard`

---

### 7.2 Rôle de chaque guard

#### JwtAuthGuard
Vérifie le JWT et identifie l’utilisateur.

#### ActiveClientGuard
Vérifie :
- la présence du client actif
- l’appartenance de l’utilisateur au client
- le statut actif du rattachement

#### ModuleAccessGuard
Vérifie :
- que le module demandé est actif globalement
- que le module est activé pour le client actif

#### PermissionsGuard
Vérifie :
- les rôles de l’utilisateur
- les permissions agrégées
- la présence de la permission requise

---

### 7.3 Décorateur cible
Décorateur à prévoir :

`@RequirePermissions(...)`

Exemple :
```ts
@RequirePermissions('budgets.read')
```

---

## 8. Endpoints

### 8.1 Platform Admin — Modules

Routes protégées par :

* `JwtAuthGuard`
* `PlatformAdminGuard`

#### GET /api/modules

Liste du catalogue global des modules

#### GET /api/clients/:clientId/modules

Liste des modules et statuts pour un client

#### POST /api/clients/:clientId/modules

Active un module pour un client

Body :

```json
{
  "moduleCode": "budgets"
}
```

#### PATCH /api/clients/:clientId/modules/:moduleCode

Modifie le statut d’un module pour un client

Body :

```json
{
  "status": "DISABLED"
}
```

---

### 8.2 Client Admin — Roles

Routes protégées par :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ClientAdminGuard`

#### GET /api/roles

Liste les rôles du client actif

#### POST /api/roles

Crée un rôle

Body :

```json
{
  "name": "Responsable budgets",
  "description": "Peut consulter et modifier les budgets"
}
```

#### GET /api/roles/:id

Retourne le détail d’un rôle

#### PATCH /api/roles/:id

Met à jour un rôle

#### DELETE /api/roles/:id

Supprime un rôle

Règles :

* impossible si `isSystem = true`
* impossible si règles métier futures de blocage
* suppression conditionnée au client actif

---

### 8.3 Permissions

#### GET /api/permissions

Liste les permissions disponibles pour le client actif

Comportement :

* retourne uniquement les permissions des modules activés pour le client actif

#### PUT /api/roles/:id/permissions

Remplace les permissions d’un rôle

Body :

```json
{
  "permissionIds": ["perm_1", "perm_2"]
}
```

Règles :

* le rôle doit appartenir au client actif
* les permissions doivent appartenir à des modules activés

---

### 8.4 Assignation rôles utilisateur

#### GET /api/users/:id/roles

Liste les rôles d’un utilisateur dans le client actif

#### PUT /api/users/:id/roles

Remplace les rôles d’un utilisateur dans le client actif

Body :

```json
{
  "roleIds": ["role_1", "role_2"]
}
```

Règles :

* l’utilisateur doit appartenir au client actif
* les rôles doivent appartenir au client actif

---

## 9. Prisma cible

```prisma
enum ClientModuleStatus {
  ENABLED
  DISABLED
}

model Module {
  id            String         @id @default(cuid())
  code          String         @unique
  name          String
  description   String?
  isActive      Boolean        @default(true)
  permissions   Permission[]
  clientModules ClientModule[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model ClientModule {
  id        String             @id @default(cuid())
  clientId  String
  moduleId  String
  status    ClientModuleStatus @default(ENABLED)
  client    Client             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  module    Module             @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt

  @@unique([clientId, moduleId])
  @@index([clientId])
  @@index([moduleId])
}

model Role {
  id              String           @id @default(cuid())
  clientId        String
  name            String
  description     String?
  isSystem        Boolean          @default(false)
  client          Client           @relation(fields: [clientId], references: [id], onDelete: Cascade)
  rolePermissions RolePermission[]
  userRoles       UserRole[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@unique([clientId, name])
  @@index([clientId])
}

model Permission {
  id              String           @id @default(cuid())
  code            String           @unique
  label           String
  description     String?
  moduleId        String
  module          Module           @relation(fields: [moduleId], references: [id], onDelete: Restrict)
  rolePermissions RolePermission[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([moduleId])
}

model RolePermission {
  id           String      @id @default(cuid())
  roleId       String
  permissionId String
  role         Role        @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
}
```

---

## 10. Critères d’acceptation

### Côté plateforme

* un `PLATFORM_ADMIN` peut consulter le catalogue des modules
* un `PLATFORM_ADMIN` peut activer un module pour un client
* un `PLATFORM_ADMIN` peut désactiver un module pour un client

### Côté client

* un `CLIENT_ADMIN` peut créer un rôle dans son client
* un `CLIENT_ADMIN` peut modifier un rôle de son client
* un `CLIENT_ADMIN` peut supprimer un rôle non système de son client
* un `CLIENT_ADMIN` peut associer des permissions à un rôle
* un `CLIENT_ADMIN` peut assigner un ou plusieurs rôles à un utilisateur de son client

### Sécurité

* un module désactivé est inaccessible
* une permission d’un module désactivé ne peut pas être attribuée
* aucune fuite inter-client n’est possible
* le backend reste la source de vérité
* le client actif est toujours pris en compte
* un utilisateur ne peut recevoir un rôle que s’il appartient au client du rôle

---

## 11. Hors périmètre

Cette RFC n’inclut pas :

* l’héritage de rôles
* les deny explicites
* les permissions conditionnelles avancées
* l’interface frontend détaillée
* l’audit avancé des permissions effectives
* la gestion dynamique du catalogue modules par les clients

---

## 12. Ordre d’implémentation

### Lot 1

* ajouter `Module`
* ajouter `ClientModule`
* seed du catalogue modules
* endpoints Platform Admin de gestion des modules

### Lot 2

* ajouter `Role`
* ajouter `Permission`
* ajouter `RolePermission`
* ajouter `UserRole`
* seed des permissions globales

### Lot 3

* CRUD rôles
* gestion permissions d’un rôle
* assignation rôles utilisateur

### Lot 4

* `ModuleAccessGuard`
* `PermissionsGuard`
* décorateur `@RequirePermissions()`
* sécurisation des premiers modules métier

---

## 13. Décisions d’architecture

* `Permission` est un référentiel global plateforme
* `Role` est spécifique à un client
* `UserRole` porte seulement `userId` et `roleId`
* le client du rôle est déduit via `Role.clientId`
* l’appartenance utilisateur ↔ client reste portée par `ClientUser`
* `CLIENT_ADMIN` administre son client
* `PLATFORM_ADMIN` administre le périmètre fonctionnel disponible

