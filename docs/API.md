# API Starium Orchestra

Toutes les routes sont préfixées par **`/api`** (ex. `POST /api/auth/login`).

Références : RFC-002 (auth), RFC-008 (gestion des utilisateurs), RFC-009 (gestion des clients), RFC-011 (rôles, permissions et modules).

---

## 1. Authentification — `/api/auth`

Aucun header d’autorisation. Corps des requêtes en JSON.

### POST /api/auth/login

Connexion par email / mot de passe. Retourne un access token (JWT) et un refresh token.

**Body (JSON)**

| Champ     | Type   | Obligatoire | Description        |
|-----------|--------|-------------|--------------------|
| `email`   | string | oui         | Email (format valide) |
| `password`| string | oui         | Mot de passe (min. 1 caractère) |

**Réponse 200**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "1a76cf26ae3bcc38963bae24c249f3ee..."
}
```

**Erreurs :** 400 (validation), 401 (identifiants invalides).

---

### POST /api/auth/refresh

Obtention d’un nouveau couple access / refresh token à partir d’un refresh token valide. L’ancien refresh token est invalidé.

**Body (JSON)**

| Champ          | Type   | Obligatoire | Description     |
|----------------|--------|-------------|-----------------|
| `refreshToken`| string | oui         | Refresh token reçu au login |

**Réponse 200** : même forme que login (`accessToken`, `refreshToken`).

**Erreurs :** 400 (validation), 401 (refresh token invalide ou expiré).

---

### POST /api/auth/logout

Invalide le refresh token fourni (révocation côté serveur).

**Body (JSON)**

| Champ          | Type   | Obligatoire |
|----------------|--------|-------------|
| `refreshToken`| string | oui         |

**Réponse 204** (No Content).

**Erreurs :** 400 (validation). Pas d’erreur si le token est déjà invalide.

---

## 2. Profil et contexte — `/api/me`

Routes protégées par **JWT** : header `Authorization: Bearer <accessToken>` requis.

### GET /api/me

Retourne le profil global de l’utilisateur connecté (données de la table User uniquement, pas de rôle ni client).

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200**

```json
{
  "id": "clxxx...",
  "email": "jean.dupont@example.com",
  "firstName": "Jean",
  "lastName": "Dupont"
}
```

**Erreurs :** 401 (non authentifié), 404 (utilisateur non trouvé).

---

### GET /api/me/clients

Liste des clients auxquels l’utilisateur a accès (au moins un ClientUser avec ce userId).

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200**

```json
[
  {
    "id": "clxxx...",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "role": "CLIENT_ADMIN",
    "status": "ACTIVE"
  },
  {
    "id": "clyyy...",
    "name": "Beta SA",
    "slug": "beta-sa",
    "role": "CLIENT_USER",
    "status": "SUSPENDED"
  }
]
```

Notes :

- `role` et `status` proviennent de la table `ClientUser`.
- L’API renvoie tous les liens `ClientUser` (y compris `SUSPENDED` / `INVITED`) ; le frontend ne doit proposer comme client actif que ceux avec `status = \"ACTIVE\"`.

**Erreurs :** 401 (non authentifié).

---

## 3. Gestion des utilisateurs — `/api/users`

Toutes les routes sont protégées par :

1. **JwtAuthGuard** — utilisateur authentifié
2. **ActiveClientGuard** — header **`X-Client-Id`** (cuid du client) ; l’utilisateur doit avoir un ClientUser ACTIVE pour ce client
3. **ClientAdminGuard** — rôle CLIENT_ADMIN pour le client actif

Sans `X-Client-Id` valide ou sans être admin du client → **403**.

Format de réponse commun pour un utilisateur : agrégat **User + ClientUser** (jamais de `passwordHash`).

**Enums**

- **role** : `CLIENT_ADMIN` | `CLIENT_USER`
- **status** : `ACTIVE` | `SUSPENDED` | `INVITED`

---

### GET /api/users

Liste des utilisateurs du **client actif** uniquement (tous les ClientUser pour ce client).

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>` (cuid du client)

**Réponse 200**

```json
[
  {
    "id": "usr_001",
    "email": "jean.dupont@client.fr",
    "firstName": "Jean",
    "lastName": "Dupont",
    "role": "CLIENT_ADMIN",
    "status": "ACTIVE"
  }
]
```

**Erreurs :** 401 (non authentifié), 403 (client invalide ou non admin).

---

### POST /api/users

Crée un utilisateur ou rattache un utilisateur existant au client actif.

**Comportement**

- **Email déjà existant** : rattachement au client via un nouveau ClientUser.  
  - Le champ `password` est **interdit** dans ce flux (si fourni → **400 BadRequest**, pour éviter toute ambiguïté sur la modification de mot de passe).
- **Email inexistant** : création du User (avec mot de passe hashé) + création du ClientUser. Le champ **`password` est obligatoire** (min. 8 caractères).
- Si un ClientUser (userId, clientId) existe déjà → **409 Conflict**.

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`

**Body (JSON)**

| Champ       | Type   | Obligatoire | Description |
|-------------|--------|-------------|-------------|
| `email`     | string | oui         | Email (unique, format valide) |
| `role`      | enum   | oui         | `CLIENT_ADMIN` \| `CLIENT_USER` |
| `firstName` | string | non         | Prénom |
| `lastName`  | string | non         | Nom |
| `password`  | string | si nouvel utilisateur | Min. 8 caractères (obligatoire si l’email n’existe pas encore) |

**Réponse 201** : un objet utilisateur au même format que GET /users (id, email, firstName, lastName, role, status).

**Erreurs :** 400 (validation, ex. mot de passe manquant pour nouvel utilisateur ou mot de passe fourni pour un email déjà existant), 401, 403, 409 (déjà rattaché à ce client).

---

### PATCH /api/users/:id

Met à jour l’utilisateur pour le client actif uniquement.

- **User** : `firstName`, `lastName`
- **ClientUser** (lien avec le client actif) : `role`, `status`
  - Règle métier : le **dernier `CLIENT_ADMIN`** du client **ne peut pas** être rétrogradé (`CLIENT_ADMIN` → `CLIENT_USER`) via ce flux ; tentative → **400 BadRequest** (cette opération reste possible via le flux plateforme).

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`

**Body (JSON)** — tous les champs optionnels

| Champ      | Type | Description |
|------------|------|-------------|
| `firstName`| string | Prénom |
| `lastName` | string | Nom |
| `role`     | enum | `CLIENT_ADMIN` \| `CLIENT_USER` |
| `status`   | enum | `ACTIVE` \| `SUSPENDED` \| `INVITED` |

**Réponse 200** : objet utilisateur mis à jour (même format que GET /users).

**Erreurs :** 401, 403, 404 (utilisateur non trouvé ou non rattaché à ce client), 400 (validation / tentative de rétrogradation du dernier CLIENT_ADMIN).

---

### DELETE /api/users/:id

Supprime **uniquement le lien ClientUser** (userId + client actif). Le User global n’est pas supprimé.
Règle métier : le **dernier `CLIENT_ADMIN`** du client **ne peut pas** être supprimé via ce flux ; tentative → **400 BadRequest** (suppression possible uniquement via les routes plateforme).

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`

**Réponse 204** (No Content).

**Erreurs :** 401, 403, 404 (rattachement inexistant pour ce client), 400 (tentative de suppression du dernier CLIENT_ADMIN).

---

## 4. Gestion des clients — `/api/clients`

Toutes les routes sont protégées par :

1. **JwtAuthGuard** — utilisateur authentifié
2. **PlatformAdminGuard** — `User.platformRole === 'PLATFORM_ADMIN'` (administrateur plateforme)

Sans JWT valide ou sans être Platform Admin → **401** / **403**.

Réponses **POST** et **PATCH** : strictement `{ id, name, slug }`. Pas d’exposition des champs internes Prisma.

---

### GET /api/clients

Retourne **tous** les clients, **sans pagination**, **sans filtre**, triés par **createdAt** (ordre décroissant).

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200**

```json
[
  {
    "id": "clxxx...",
    "name": "Client démo",
    "slug": "demo",
    "createdAt": "2026-03-08T10:00:00.000Z"
  }
]
```

**Erreurs :** 401 (non authentifié), 403 (non Platform Admin).

---

### POST /api/clients

Crée un client **sans** gérer d’administrateur ou de rattachement utilisateur.  
Le Platform Admin utilise ensuite les autres endpoints (`/api/platform/users`, `/api/clients/:clientId/users`, `/api/users`) pour rattacher des utilisateurs au client.

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Champ  | Type   | Obligatoire | Description                          |
|--------|--------|-------------|--------------------------------------|
| `name` | string | oui         | Nom du client                        |
| `slug` | string | oui         | Slug unique (ex. `entreprise-abc`)   |

**Exemple (curl)**

```bash
curl -s -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon client",
    "slug": "mon-client"
  }' | jq .
```

**Réponse 201**

```json
{
  "id": "clxxx...",
  "name": "Entreprise ABC",
  "slug": "entreprise-abc"
}
```

**Erreurs :** 400 (validation), 401, 403, 409 (slug déjà pris).

---

### PATCH /api/clients/:id

Met à jour le nom et/ou le slug du client. Si `slug` est fourni, il doit rester unique (un **autre** client ne doit pas déjà l’utiliser).

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)** — tous les champs optionnels

| Champ  | Type   | Description |
|--------|--------|-------------|
| `name` | string | Nom du client |
| `slug` | string | Slug unique |

**Réponse 200**

```json
{
  "id": "clxxx...",
  "name": "Entreprise ABC Groupe",
  "slug": "abc-groupe"
}
```

**Erreurs :** 401, 403, 404 (client non trouvé), 409 (slug déjà utilisé par un autre client).

---

### DELETE /api/clients/:id

Suppression **physique** du client. Les **ClientUser** liés sont supprimés (cascade). Les **User** ne sont **jamais** supprimés.

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 204** (No Content).

**Erreurs :** 401, 403, 404 (client non trouvé).

---

## 5. Résumé des guards et headers

| Contexte          | Headers requis                                    | Guards (ordre)                                              |
|-------------------|----------------------------------------------------|-------------------------------------------------------------|
| Auth              | —                                                  | —                                                           |
| /api/me           | `Authorization: Bearer <accessToken>`             | JwtAuthGuard                                                |
| /api/users        | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard         |
| /api/roles        | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard         |
| /api/permissions  | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard         |
| /api/clients      | `Authorization: Bearer <accessToken>`             | JwtAuthGuard → PlatformAdminGuard                           |
| /api/modules      | `Authorization: Bearer <accessToken>`             | JwtAuthGuard → PlatformAdminGuard                           |
| /api/audit-logs   | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard |
| /api/test-rbac    | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard |

---

## 5.1 RBAC métier — décorateur et conventions

Les endpoints “métier” (scopés client) utilisent :

- `@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)`
- `@RequirePermissions('<module>.<action>', ...)`

Règles :

- **Stratégie AND** : toutes les permissions listées sont requises.
- **Un seul module par route** : ne jamais mélanger `budgets.*` et `contracts.*` sur le même handler.\n  - Raison : `ModuleAccessGuard` déduit le module depuis la 1ère permission et doit rester non ambigu.
- **`CLIENT_ADMIN` n’implique pas “toutes les permissions métier”** : l’administration du client passe par `ClientAdminGuard`, les permissions métier restent RBAC.

## 6. Gestion des utilisateurs globaux — `/api/platform/users`

Routes **réservées au Platform Admin**.

### POST /api/platform/users

Crée un **utilisateur global** (aucun rattachement client n’est créé).

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Champ      | Type   | Obligatoire | Description |
|------------|--------|-------------|-------------|
| `email`    | string | oui         | Email unique |
| `password` | string | oui         | Mot de passe (min. 8 caractères) |
| `firstName`| string | non         | Prénom |
| `lastName` | string | non         | Nom |

**Réponse 201**

```json
{
  "id": "usr_001",
  "email": "user@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "createdAt": "2026-03-08T10:00:00.000Z",
  "updatedAt": "2026-03-08T10:00:00.000Z",
  "platformRole": null
}
```

**Erreurs :** 400 (validation), 401, 403 (non Platform Admin), 409 (email déjà utilisé).

---

## 7. Gestion des rattachements plateforme — `/api/clients/:clientId/users`

---

## 8. Gestion des modules — `/api/modules`, `/api/clients/:clientId/modules`

Routes réservées au **Platform Admin** (RFC-011, niveau plateforme).

### GET /api/modules

Liste le **catalogue global** des modules disponibles sur la plateforme.

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200**

```json
[
  {
    "id": "mod_budgets",
    "code": "budgets",
    "name": "Budgets",
    "description": "Gestion des budgets IT",
    "isActive": true,
    "createdAt": "2026-03-09T10:00:00.000Z",
    "updatedAt": "2026-03-09T10:00:00.000Z"
  }
]
```

**Erreurs :** 401 (non authentifié), 403 (non Platform Admin).

---

### GET /api/clients/:clientId/modules

Liste les modules disponibles et leur **statut** pour un client donné.

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200**

```json
[
  {
    "id": "mod_budgets",
    "code": "budgets",
    "name": "Budgets",
    "description": "Gestion des budgets IT",
    "isActive": true,
    "status": "ENABLED"
  },
  {
    "id": "mod_contracts",
    "code": "contracts",
    "name": "Contrats",
    "description": "Suivi des contrats",
    "isActive": true,
    "status": null
  }
]
```

`status` peut valoir `ENABLED`, `DISABLED` ou `null` (jamais configuré pour ce client).

**Erreurs :** 401, 403, 404 (client non trouvé).

---

### POST /api/clients/:clientId/modules

Active un module pour un client (opération **idempotente**).

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

```json
{
  "moduleCode": "budgets"
}
```

**Réponse 201**

```json
{
  "id": "mod_budgets",
  "code": "budgets",
  "name": "Budgets",
  "description": "Gestion des budgets IT",
  "isActive": true,
  "status": "ENABLED"
}
```

**Erreurs :**

- 400 : module inactif sur la plateforme
- 401, 403
- 404 : client ou module non trouvé

---

### PATCH /api/clients/:clientId/modules/:moduleCode

Modifie le statut d’un module pour un client.

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

```json
{
  "status": "DISABLED"
}
```

`status` ∈ `ENABLED` \| `DISABLED`.

**Réponse 200**

```json
{
  "id": "mod_budgets",
  "code": "budgets",
  "name": "Budgets",
  "description": "Gestion des budgets IT",
  "isActive": true,
  "status": "DISABLED"
}
```

**Erreurs :**

- 400 : module inactif sur la plateforme
- 401, 403
- 404 : client ou module non trouvé

---

## 9. Gestion des rôles métier — `/api/roles`

Routes réservées au **Client Admin** du **client actif** (RFC-011, niveau client).

Toutes les routes exigent :

1. `Authorization: Bearer <accessToken>`
2. `X-Client-Id: <clientId>` (client actif)
3. Guards : `JwtAuthGuard` → `ActiveClientGuard` → `ClientAdminGuard`

### GET /api/roles

Liste les rôles métier définis dans le client actif.

**Réponse 200**

```json
[
  {
    "id": "role_budgets_manager",
    "name": "Responsable budgets",
    "description": "Peut consulter et modifier les budgets",
    "isSystem": false,
    "createdAt": "2026-03-09T10:00:00.000Z",
    "updatedAt": "2026-03-09T10:00:00.000Z"
  }
]
```

---

### POST /api/roles

Crée un rôle métier dans le client actif.

**Body (JSON)**

```json
{
  "name": "Responsable budgets",
  "description": "Peut consulter et modifier les budgets"
}
```

**Réponse 201**

Même format que GET /api/roles (un seul objet).

**Erreurs :**

- 400 : validation
- 401, 403
- 409 : un rôle avec ce `name` existe déjà dans le client actif

---

### GET /api/roles/:id

Retourne le détail d’un rôle du client actif.

**Erreurs :** 401, 403, 404 (rôle non trouvé pour ce client).

---

### PATCH /api/roles/:id

Met à jour un rôle métier (nom, description).

**Body (JSON)** — tous les champs optionnels

```json
{
  "name": "Responsable budgets senior",
  "description": "Droits étendus sur les budgets"
}
```

**Réponse 200** : rôle mis à jour.

**Erreurs :**

- 400 : validation
- 401, 403
- 404 : rôle non trouvé pour ce client
- 409 : un autre rôle du client utilise déjà ce `name`

---

### DELETE /api/roles/:id

Supprime un rôle du client actif.

Règles :

- impossible si `isSystem = true` → **409 Conflict**
- impossible si le rôle est encore assigné à au moins un utilisateur → **409 Conflict**

**Réponse 204** (No Content) en cas de succès.

**Erreurs :** 401, 403, 404, 409.

---

## 10. Permissions disponibles — `/api/permissions`

Liste les permissions **autorisées** pour le client actif, c’est-à-dire :

- permissions dont le module est `isActive = true`
- ET dont le module est `ENABLED` pour le client actif (`ClientModule.status = ENABLED`)

### GET /api/permissions

**Réponse 200**

```json
[
  {
    "id": "perm_budgets_read",
    "code": "budgets.read",
    "label": "Lecture des budgets",
    "description": "Peut consulter les budgets",
    "moduleCode": "budgets",
    "moduleName": "Budgets"
  }
]
```

**Erreurs :** 401, 403.

---

## 11. Permissions d’un rôle — `/api/roles/:id/permissions`

### PUT /api/roles/:id/permissions

Remplace la liste des permissions d’un rôle métier du client actif.

**Body (JSON)**

```json
{
  "permissionIds": ["perm_budgets_read", "perm_budgets_update"]
}
```

**Comportement**

- Le rôle doit appartenir au client actif, sinon **404**
- Toutes les `permissionIds` doivent correspondre à des permissions de **modules activés** pour le client actif, sinon **400**

**Réponse 200**

```json
{
  "role": {
    "id": "role_budgets_manager",
    "name": "Responsable budgets",
    "description": "Peut consulter et modifier les budgets",
    "isSystem": false,
    "createdAt": "2026-03-09T10:00:00.000Z",
    "updatedAt": "2026-03-09T10:00:00.000Z"
  },
  "permissionIds": ["perm_budgets_read", "perm_budgets_update"]
}
```

**Erreurs :** 400, 401, 403, 404.

---

## 12. Assignation des rôles utilisateur — `/api/users/:id/roles`

### GET /api/users/:id/roles

Liste les rôles métier d’un utilisateur **dans le client actif**.

**Réponse 200**

```json
[
  {
    "id": "role_budgets_manager",
    "name": "Responsable budgets",
    "description": "Peut consulter et modifier les budgets",
    "isSystem": false
  }
]
```

**Erreurs :**

- 401, 403
- 404 : utilisateur non trouvé dans le client actif (ou lien inactif)

---

### PUT /api/users/:id/roles

Remplace l’ensemble des rôles métier d’un utilisateur dans le client actif.

**Body (JSON)**

```json
{
  "roleIds": ["role_budgets_manager", "role_projects_viewer"]
}
```

**Comportement**

- L’utilisateur doit appartenir au client actif avec un `ClientUser` `ACTIVE`, sinon **404**
- Tous les rôles doivent appartenir au client actif, sinon **400**
- Les rôles associés à d’autres clients ne sont pas modifiés

**Réponse 200**

```json
{
  "userId": "usr_001",
  "roleIds": ["role_budgets_manager", "role_projects_viewer"]
}
```

**Erreurs :** 400, 401, 403, 404.

---

## 13. Endpoint de test RBAC — `/api/test-rbac`

Endpoint technique permettant de valider la chaîne :

`JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`

### GET /api/test-rbac

Nécessite la permission `budgets.read` dans le client actif.

Notes :

- Le check permission est **dynamique** (DB) : `UserRole → RolePermission → Permission` filtré sur le client actif.\n  - Pas de liste statique en dur dans le code.
- `PermissionsGuard` utilise un **cache request** (`request.resolvedPermissionCodes?: Set<string>`) pour ne résoudre les permissions qu’une seule fois par requête.

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`

**Réponse 200**

```json
{
  "ok": true
}
```

**Erreurs :**

- 401 : non authentifié
- 403 : client invalide / module budgets désactivé / permission manquante
---

## 14. Audit logs — `/api/audit-logs`, `/api/platform/audit-logs`

### 14.1 GET /api/audit-logs — consultation des logs du client actif

Traçabilité des actions sensibles dans le **client actif**.  
Routes protégées par :

- `JwtAuthGuard`
- `ActiveClientGuard`
- `ModuleAccessGuard`
- `PermissionsGuard` avec `@RequirePermissions("audit_logs.read")`

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`

**Query params (tous optionnels)**

| Champ        | Type   | Description                                          |
|--------------|--------|------------------------------------------------------|
| `resourceType` | string | Type de ressource (ex. `user`, `client`, `module`)  |
| `action`     | string | Code d’action `<resource>.<action>` (ex. `user.created`) |
| `userId`     | string | Filtre sur l’utilisateur initiateur                  |
| `dateFrom`   | string (ISO) | Date de début (inclus)                        |
| `dateTo`     | string (ISO) | Date de fin (inclus)                          |
| `offset`     | number | Décalage de pagination (par défaut 0)               |
| `limit`      | number | Taille de page (par défaut 50, max 200)             |

**Réponse 200**

```json
[
  {
    "id": "log_001",
    "clientId": "clxxx...",
    "userId": "usr_001",
    "action": "module.enabled",
    "resourceType": "module",
    "resourceId": "budgets",
    "oldValue": null,
    "newValue": { "status": "ENABLED" },
    "ipAddress": "127.0.0.1",
    "userAgent": "PostmanRuntime/7.37.0",
    "requestId": "4f6a0ca5-1c0b-4c7c-bfa3-7e1f3a5b28c1",
    "createdAt": "2026-03-10T08:30:00.000Z"
  }
]
```

Règles :

- `clientId` est toujours celui du **client actif** (isolation stricte).
- `userId` peut être `null` pour des actions système ou jobs.
- `oldValue` / `newValue` ne contiennent **jamais** de données sensibles (`passwordHash`, tokens…).

**Erreurs :** 401, 403 (client invalide, module `audit_logs` désactivé, permission manquante).

---

### 14.1 GET /api/platform/audit-logs — consultation globale (plateforme)

Consultation des logs métier **tous clients** pour le Platform Admin.

**Guards**

- `JwtAuthGuard`
- `PlatformAdminGuard`

**Headers**

- `Authorization: Bearer <accessToken>`

**Query params**

Identiques à `/api/audit-logs`, avec en plus :

| Champ      | Type   | Description                          |
|------------|--------|--------------------------------------|
| `clientId` | string | Filtre sur un client particulier     |

**Réponse 200**

Même format que `/api/audit-logs`, mais potentiellement sur plusieurs clients.

**Erreurs :** 401, 403 (non Platform Admin).

---

Routes suivantes **réservées au Platform Admin** pour rattacher/détacher des utilisateurs à un client.

### POST /api/clients/:clientId/users

Rattache un utilisateur à un client donné. Deux modes :

1. **Par `userId`** (user existant) ;
2. **Par `email`** (création éventuelle du User).

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON) — cas 1 : userId**

```json
{
  "userId": "usr_001",
  "role": "CLIENT_ADMIN",
  "status": "ACTIVE"
}
```

**Body (JSON) — cas 2 : email**

```json
{
  "email": "nouvel.admin@client.fr",
  "password": "StrongPassword123!",
  "firstName": "Admin",
  "lastName": "Client",
  "role": "CLIENT_ADMIN",
  "status": "ACTIVE"
}
```

Règles :

- Si `userId` est fourni :\n  - le User doit exister ;\n  - `password` est interdit (400 si fourni).\n- Si `email` est fourni et que le User existe déjà :\n  - `password` est interdit (400 si fourni) ;\n  - on utilise le User existant tel quel.\n- Si `email` est fourni et que le User n’existe pas :\n  - `password` est obligatoire (min. 8 car.) ;\n  - un nouveau User est créé, puis rattaché au client.\n- Dans tous les cas, si le lien `(userId, clientId)` existe déjà → **409 Conflict**.

**Réponse 201**

```json
{
  "user": {
    "id": "usr_001",
    "email": "user@example.com",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "clientUser": {
    "clientId": "clxxx...",
    "role": "CLIENT_ADMIN",
    "status": "ACTIVE"
  }
}
```

**Erreurs :** 400 (validation / règles métier), 401, 403 (non Platform Admin), 404 (client ou user introuvable), 409 (rattachement déjà existant).

---

### DELETE /api/clients/:clientId/users/:userId

Supprime **uniquement** le lien `ClientUser` pour ce client et cet utilisateur. Le `User` global n’est **jamais** supprimé.

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 204** (No Content).

**Erreurs :** 401, 403 (non Platform Admin), 404 (rattachement introuvable).

Validation globale : body JSON avec **whitelist** + **forbidNonWhitelisted** (champs inconnus refusés).
