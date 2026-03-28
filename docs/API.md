# API Starium Orchestra

Toutes les routes sont préfixées par **`/api`** (ex. `POST /api/auth/login`).

Références : RFC-002 (auth), RFC-008 (gestion des utilisateurs), RFC-009 (gestion des clients), RFC-011 (rôles, permissions et modules), RFC-014-2 (GET /me avec platformRole), RFC-015-2 (Budget Management Backend), RFC-016 (Budget Reporting API), RFC-017 (Budget Reallocation), RFC-018 (Budget Data Import), RFC-019 (Budget Versioning), RFC-022 (Budget Dashboard API), RFC-023 (Client RBAC Administration), RFC-PROJ-001 (module Projets MVP), RFC-PROJ-INT-003 / RFC-PROJ-INT-005 (OAuth Microsoft 365), RFC-PROJ-INT-007 / RFC-PROJ-INT-008 / RFC-PROJ-INT-009 / RFC-PROJ-INT-016 (lien projet Microsoft, sync tâches, sync documents, sync bidirectionnelle tâches).

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

### Modèle de rôles (global vs client actif)

Le backend distingue explicitement deux niveaux de rôle, complémentaires et non substituables :

- **Rôle global (`platformRole`)** : porté par `User.platformRole`, actuellement `PLATFORM_ADMIN` ou `null`.
- **Rôle client (`ClientUser.role`)** : porté par le rattachement au client actif (`CLIENT_ADMIN` ou `CLIENT_USER`).

Règles d’application :

- `platformRole` sert uniquement aux routes plateforme (`/api/clients`, `/api/platform/*`, `/api/modules`).
- `ClientUser.role` sert uniquement aux routes client-scopées (ex. `/api/users`, `/api/roles`, `/api/permissions` avec `X-Client-Id`).
- Un `PLATFORM_ADMIN` n’obtient pas automatiquement les droits `CLIENT_ADMIN` dans un client.
- Un `CLIENT_ADMIN` n’obtient pas automatiquement toutes les permissions métier (`budgets.*`, `projects.*`, etc.) : ces droits restent pilotés par le RBAC métier.

### GET /api/me

Retourne le profil global de l’utilisateur connecté (données de la table User). Depuis RFC-014-2, la réponse inclut `platformRole` pour piloter la navigation plateforme côté frontend.

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200**

```json
{
  "id": "clxxx...",
  "email": "jean.dupont@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "platformRole": "PLATFORM_ADMIN"
}
```

- `platformRole` : `"PLATFORM_ADMIN"` ou `null`. Permet au frontend d'afficher ou masquer les entrées « Administration plateforme » (sidebar, redirections).

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
    "status": "ACTIVE",
    "isDefault": true
  },
  {
    "id": "clyyy...",
    "name": "Beta SA",
    "slug": "beta-sa",
    "role": "CLIENT_USER",
    "status": "SUSPENDED",
    "isDefault": false
  }
]
```

Notes :

- `role` et `status` proviennent de la table `ClientUser`.
- `isDefault` indique si ce `ClientUser` est marqué comme **client par défaut** pour l’utilisateur (RFC-009-1). Il y a au plus un `ClientUser` avec `isDefault = true` par utilisateur.
- L’API renvoie tous les liens `ClientUser` (y compris `SUSPENDED` / `INVITED`) ; le frontend ne doit proposer comme client actif que ceux avec `status = "ACTIVE"`.

**Erreurs :** 401 (non authentifié).

---

### PATCH /api/me/default-client

Permet à l’utilisateur connecté de définir son **client par défaut** (RFC-009-1). Le client par défaut est une préférence persistée côté serveur, utilisée lors du bootstrap s’il n’existe pas de client actif local valide.

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

```json
{
  "clientId": "clxxx..."
}
```

Règles :

- le `clientId` doit correspondre à un `ClientUser` de l’utilisateur.
- le `ClientUser.status` doit être `ACTIVE`.
- la mise à jour est transactionnelle : tous les autres `ClientUser` de l’utilisateur passent à `isDefault = false`, puis le `ClientUser` cible est mis à `isDefault = true`.

**Réponse 200**

```json
{
  "success": true,
  "defaultClientId": "clxxx..."
}
```

**Erreurs :**

- `403 Forbidden` si le client ne fait pas partie des clients accessibles par l’utilisateur.
- `400 Bad Request` si le rattachement existe mais n’est pas `ACTIVE`.
- `401` si non authentifié.

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

Le backend applique immédiatement les profils RBAC système du client (via `DefaultProfilesService`).  
Pré-requis : le référentiel global des permissions doit être présent (seed modules/permissions).

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

**Erreurs :** 400 (validation), 401, 403, 409 (slug déjà pris), 500 (permissions globales manquantes pour initialiser les profils RBAC système).

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
| /api/budget-exercises, /api/budgets, /api/budget-envelopes, /api/budget-lines (CRUD) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.create` / `budgets.update`) |
| /api/general-ledger-accounts (CRUD) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.general-ledger-accounts.read` / `.create` / `.update`) |
| /api/analytical-ledger-accounts (CRUD) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.analytical-ledger-accounts.read` / `.create` / `.update`) |
| /api/cost-centers (CRUD) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.cost-centers.read` / `.create` / `.update`) |
| /api/financial-allocations, /api/financial-events, /api/budget-lines/:id/allocations, /api/budget-lines/:id/events | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.create`) |
| /api/budget-reallocations | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.update`) |
| /api/budget-reporting/* | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read`) |
| /api/budget-dashboard | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read`) |
| /api/budget-imports/* (analyze, preview, execute) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.update`) |
| /api/budget-import-mappings | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.update`) |
| /api/budget-version-sets | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read`) |
| /api/budgets/:id/create-baseline, create-revision, activate-version, archive-version, version-history, compare | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.create` / `budgets.update` selon l’action) |

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

Routes réservées au **Client Admin** du **client actif** (RFC-011, RFC-023).

**Profils par défaut** : à la création d’un client, des rôles prédéfinis (Directeur, Responsable Budgets, Contributeur Budgets) sont créés automatiquement. Le seed les applique aussi à tous les clients existants. Voir [docs/default-profiles.md](default-profiles.md).

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

Retourne le détail d’un rôle du client actif, **incluant la liste des IDs de permissions** du rôle (RFC-023).

**Réponse 200**

Même structure que un élément de GET /api/roles, **plus** :

| Champ           | Type     | Description                |
|-----------------|----------|----------------------------|
| `permissionIds` | string[] | IDs des permissions du rôle |

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

**Règles (RFC-023)** : si le rôle a `isSystem = true`, toute modification est refusée → **403 Forbidden**.

**Erreurs :**

- 400 : validation
- 401, 403 (403 si rôle système)
- 404 : rôle non trouvé pour ce client
- 409 : un autre rôle du client utilise déjà ce `name`

---

### DELETE /api/roles/:id

Supprime un rôle du client actif.

**Règles (RFC-023)** :

- si `isSystem = true` → **403 Forbidden** (message : « Impossible de supprimer un rôle système »)
- si le rôle est encore assigné à au moins un utilisateur → **409 Conflict** (message : « Impossible de supprimer : rôle encore assigné à au moins un utilisateur »)

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
- Si le rôle a `isSystem = true` → **403 Forbidden** (RFC-023 : « Impossible de modifier les permissions d’un rôle système »)
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

---

## 15. Structure budgétaire (Budget Management) — `/api/budget-exercises`, `/api/budgets`, `/api/budget-envelopes`, `/api/budget-lines`

Référence : **RFC-015-2** (Budget Management Backend). Ces endpoints permettent de gérer la **structure budgétaire** : exercices, budgets, enveloppes et lignes budgétaires. Ils doivent être utilisés **avant** le noyau financier (allocations et événements) pour créer les entités. Pas de suppression physique (DELETE) ; pas de `clientId` dans les body (toujours dérivé du client actif).

### Guards et headers (structure budgétaire)

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`
- **Permissions** : `budgets.read` (GET), `budgets.create` (POST), `budgets.update` (PATCH)

### Format des listes

Toutes les listes retournent : `{ "items": [...], "total": number, "limit": number, "offset": number }`. Par défaut `limit = 20`, max `100`.

### Enums (structure budgétaire)

- **BudgetExerciseStatus** : `DRAFT`, `ACTIVE`, `CLOSED`, `ARCHIVED`
- **BudgetStatus** : `DRAFT`, `ACTIVE`, `LOCKED`, `ARCHIVED`
- **BudgetEnvelopeType** : `RUN`, `BUILD`, `TRANSVERSE`
- **BudgetLineStatus** : `DRAFT`, `ACTIVE`, `CLOSED`, `ARCHIVED`
- **ExpenseType** : `OPEX`, `CAPEX`
- **BudgetLineAllocationScope** (RFC-021) : `ENTERPRISE`, `ANALYTICAL`

Les montants en entrée/sortie sont des **number** (jamais d’objet Decimal en API).

---

### GET /api/budget-exercises

Liste les exercices budgétaires du client actif. **Query** : `status`, `search` (name/code), `offset`, `limit`. **Tri** : `startDate desc`.

---

### POST /api/budget-exercises

Crée un exercice. **Body** : `name`, `code?`, `startDate`, `endDate`, `status?`. Si `code` absent, généré (format `EX-YYYY-suffix`). **Erreurs** : 400 (dates incohérentes), 409 (code déjà utilisé).

---

### GET /api/budget-exercises/:id

Détail d’un exercice. **Erreurs** : 404 si hors client.

---

### PATCH /api/budget-exercises/:id

Met à jour un exercice (champs partiels). **Refusé** si status = ARCHIVED.

---

### GET /api/budgets

Liste les budgets. **Query** : `exerciseId`, `status`, `ownerUserId`, `search`, `offset`, `limit`. **Tri** : `createdAt desc`.

---

### POST /api/budgets

Crée un budget. **Body** : `exerciseId`, `name`, `code?`, `description?`, `currency`, `status?`, `ownerUserId?`. L’exercice doit appartenir au client ; si `ownerUserId` fourni, l’utilisateur doit être rattaché au client actif. Si `code` absent, généré (`BUD-suffix`).

---

### GET /api/budgets/:id — PATCH /api/budgets/:id

Détail et mise à jour. PATCH refusé si status = LOCKED ou ARCHIVED.

---

### GET /api/budget-envelopes

Liste les enveloppes. **Query** : `budgetId`, `search`, `offset`, `limit`. **Tri** : `createdAt desc`.

---

### POST /api/budget-envelopes

Crée une enveloppe. **Body** : `budgetId`, `name`, `code?`, `description?`, `type` (obligatoire), `parentId?`, `sortOrder?`. Le budget ne doit pas être LOCKED/ARCHIVED. Si `parentId` fourni, l’enveloppe parent doit exister et appartenir au même budget/client. Si `code` absent, généré (`ENV-suffix`).

---

### GET /api/budget-envelopes/:id — PATCH /api/budget-envelopes/:id

Détail et mise à jour. PATCH refusé si le **budget parent** est LOCKED ou ARCHIVED (BudgetEnvelope n’a pas de champ status).

---

### GET /api/budget-lines

Liste les lignes budgétaires. **Query** : `budgetId`, `envelopeId`, `status`, `expenseType`, `costCenterId` (lignes ayant un split vers ce centre), `generalLedgerAccountId`, `allocationScope` (ENTERPRISE | ANALYTICAL), `search`, `offset`, `limit`. **Tri** : `createdAt desc`. Les montants et champs analytiques (generalLedgerAccount, analyticalLedgerAccount, costCenterSplits) sont inclus. Les montants retournés sont des **number**.

---

### POST /api/budget-lines

Crée une ligne. **Body** : `budgetId`, `envelopeId`, `name`, `code?`, `description?`, `expenseType`, **`generalLedgerAccountId`** (obligatoire), `analyticalLedgerAccountId?`, `allocationScope?` (défaut ENTERPRISE), `costCenterSplits?` (tableau `[{ costCenterId, percentage }]` si ANALYTICAL ; somme = 100), `initialAmount`, `revisedAmount?`, `currency`, `status?`. L’enveloppe et le compte comptable doivent appartenir au client. **Règles** : ENTERPRISE ⇒ 0 split ; ANALYTICAL ⇒ au moins 1 split, somme 100 %, unicité costCenter par ligne. Si `code` absent, généré (`BL-suffix`).

---

### GET /api/budget-lines/:id — PATCH /api/budget-lines/:id

Détail et mise à jour d’une ligne. Réponse inclut `generalLedgerAccount`, `analyticalLedgerAccount`, `costCenterSplits`. PATCH : champs optionnels dont `generalLedgerAccountId`, `analyticalLedgerAccountId`, `allocationScope`, `costCenterSplits`. Si `allocationScope` = ENTERPRISE, les splits existants sont supprimés ; si ANALYTICAL et `costCenterSplits` non fourni, les splits existants sont conservés. Si `revisedAmount` change, `remainingAmount` est recalculé. PATCH refusé si budget parent LOCKED/ARCHIVED ou si ligne ARCHIVED/CLOSED.

**Note** : les routes `GET /api/budget-lines/:id/allocations` et `GET /api/budget-lines/:id/events` sont documentées en §16 (noyau financier).

---

### Référentiels RFC-021 (comptes et centres de coûts)

**General Ledger Accounts** — `GET /api/general-ledger-accounts`, `GET /api/general-ledger-accounts/:id`, `POST /api/general-ledger-accounts`, `PATCH /api/general-ledger-accounts/:id`. **Permissions** : `budgets.general-ledger-accounts.read`, `.create`, `.update`. **Body create** : `code`, `name`, `description?`, `isActive?`, `sortOrder?`. **Query list** : `search`, `isActive`, `offset`, `limit`.

**Analytical Ledger Accounts** — `GET /api/analytical-ledger-accounts`, `GET /api/analytical-ledger-accounts/:id`, `POST /api/analytical-ledger-accounts`, `PATCH /api/analytical-ledger-accounts/:id`. **Permissions** : `budgets.analytical-ledger-accounts.read`, `.create`, `.update`. Même schéma body/query que General Ledger Accounts.

**Cost Centers** — `GET /api/cost-centers`, `GET /api/cost-centers/:id`, `POST /api/cost-centers`, `PATCH /api/cost-centers/:id`. **Permissions** : `budgets.cost-centers.read`, `.create`, `.update`. Même schéma body/query. Tous scopés client (`X-Client-Id`).

---

## 16. Noyau financier — `/api/financial-allocations`, `/api/financial-events`, `/api/budget-lines/:id/allocations`, `/api/budget-lines/:id/events`

Référence : **RFC-015-1B** (Financial Core Backend). Ces endpoints permettent de gérer les **allocations** et **événements** financiers sur des **lignes budgétaires existantes**, et de consulter les listes par ligne. La **structure budgétaire** (exercices, budgets, enveloppes, lignes) est gérée par les API de la [section 15](#15-structure-budgétaire-budget-management--apibudget-exercises-apibudgets-apibudget-envelopes-apibudget-lines).

### Guards et headers

Toutes les routes exigent :

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>` (client actif)
- `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- Permissions : **`budgets.read`** pour les GET, **`budgets.create`** pour les POST

Le `clientId` est **toujours** dérivé du client actif ; il ne doit **jamais** être fourni dans le body.

### Format de réponse des listes

Toutes les listes retournent un objet paginé :

```json
{
  "items": [ ... ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

Tri par défaut : **allocations** → `effectiveDate desc`, puis `createdAt desc` ; **events** → `eventDate desc`, puis `createdAt desc`.

### Enums (Prisma, @prisma/client)

- **AllocationType** : `PLANNED`, `RESERVED`, `COMMITTED`, `CONSUMED`, `FORECAST`, `REALLOCATED`, `CANCELLED`
- **FinancialEventType** : `LINE_CREATED`, `BUDGET_INITIALIZED`, `ALLOCATION_ADDED`, `ALLOCATION_UPDATED`, `COMMITMENT_REGISTERED`, `CONSUMPTION_REGISTERED`, `FORECAST_UPDATED`, `REALLOCATION_DONE`, `CANCELLATION`, `ADJUSTMENT`
- **FinancialSourceType** : `PROJECT`, `ACTIVITY`, `SUPPLIER`, `CONTRACT`, `LICENSE`, `ORDER`, `TEAM_ASSIGNMENT`, `APPLICATION`, `ASSET`, `MANUAL`

---

### GET /api/financial-allocations

Liste les allocations du client actif, avec filtres optionnels et pagination.

**Query (tous optionnels)**

| Champ            | Type   | Description                          |
|-----------------|--------|--------------------------------------|
| `budgetLineId`  | string | Filtre sur une ligne budgétaire      |
| `allocationType`| enum   | Filtre par type d’allocation         |
| `offset`        | number | Pagination (défaut 0)                |
| `limit`         | number | Taille de page (défaut 20, max 200)  |

**Réponse 200** : `{ items, total, limit, offset }` (voir format ci-dessus).

**Erreurs :** 401, 403 (client invalide, module budgets désactivé, permission manquante).

---

### POST /api/financial-allocations

Crée une allocation et recalcule les montants de la ligne budgétaire concernée.

**Body (JSON)**

| Champ            | Type   | Obligatoire | Description |
|-----------------|--------|-------------|-------------|
| `budgetLineId`  | string | oui         | ID d’une BudgetLine du client actif |
| `sourceType`    | enum   | oui         | FinancialSourceType |
| `sourceId`      | string | oui sauf si `sourceType === "MANUAL"` | Référence de la source |
| `allocationType`| enum   | oui         | AllocationType |
| `allocatedAmount`| number| oui         | Montant ≥ 0 |
| `currency`      | string | oui         | Devise |
| `effectiveDate` | string (ISO) | non  | Date d’effet |
| `notes`         | string | non         | Notes |

**Réponse 201** : objet allocation créé (champs Prisma, dont `allocatedAmount` en Decimal sérialisé).

**Erreurs :** 400 (validation), 401, 403, 404 (ligne non trouvée ou n’appartient pas au client).

---

### GET /api/financial-events

Liste les événements financiers du client actif.

**Query (tous optionnels)**

| Champ           | Type   | Description                    |
|----------------|--------|--------------------------------|
| `budgetLineId` | string | Filtre sur une ligne           |
| `eventType`    | enum   | Filtre par type d’événement   |
| `offset`       | number | Pagination (défaut 0)         |
| `limit`        | number | Taille de page (défaut 20, max 200) |

**Réponse 200** : `{ items, total, limit, offset }`.

**Erreurs :** 401, 403.

---

### POST /api/financial-events

Crée un événement financier ; si le type est `COMMITMENT_REGISTERED` ou `CONSUMPTION_REGISTERED`, les montants de la ligne sont recalculés.

Saisie fiscale strictement validée selon RFC FC-006 (HT/TVA/TTC explicites). Le champ legacy `amount` n’est pas utilisé comme source de vérité.

**Body (JSON)**

| Champ           | Type   | Obligatoire | Description |
|----------------|--------|-------------|-------------|
| `budgetLineId` | string | oui         | ID d’une BudgetLine du client actif |
| `sourceType`   | enum   | oui         | FinancialSourceType |
| `sourceId`     | string | non         | Référence (optionnel pour MANUAL / types techniques) |
| `eventType`    | enum   | oui         | FinancialEventType |
| `amountHt`     | string (number) | optionnel | Montant HT (≥ 0). |
| `amountTtc`    | string (number) | optionnel | Montant TTC (≥ 0). |
| `taxRate`      | string (number) | optionnel | TVA % (ex: `20.00`). |
| `taxAmount`    | string (number) | optionnel | Montant TVA (≥ 0). |
| `useDefaultTaxRate` | boolean | optionnel | Si `taxRate` n’est pas fourni, utiliser explicitement `Client.defaultTaxRate`. |
| `currency`     | string | oui         | Devise |
| `eventDate`    | string (ISO) | oui  | Date de l’événement |
| `label`        | string | oui         | Libellé |
| `description`  | string | non         | Description |

**Réponse 201** : objet événement créé.

**Erreurs :** 400 (validation), 401, 403, 404 (ligne non trouvée ou n’appartient pas au client).

---

### GET /api/budget-lines/:id/allocations

Liste les allocations d’une ligne budgétaire. La ligne doit appartenir au client actif.

**Paramètre** : `id` = `budgetLineId`.

**Query (optionnels)**

| Champ   | Type   | Description           |
|---------|--------|-----------------------|
| `offset`| number | Défaut 0              |
| `limit` | number | Défaut 20, max 200    |

**Réponse 200** : `{ items, total, limit, offset }`.

**Erreurs :** 401, 403, 404 (ligne non trouvée ou n’appartient pas au client).

---

### GET /api/budget-lines/:id/events

Liste les événements financiers d’une ligne budgétaire. Même règles que ci-dessus.

**Réponse 200** : `{ items, total, limit, offset }`.

**Erreurs :** 401, 403, 404.

---

## 17. Réallocations budgétaires — `/api/budget-reallocations`

Référence : **RFC-017** (Budget Reallocation). Transfert traçable entre deux lignes budgétaires d’un même budget. La réallocation ne modifie pas `BudgetLine.revisedAmount` ; elle crée un enregistrement `BudgetReallocation`, deux `FinancialEvent` (type `REALLOCATION_DONE`) et déclenche le recalcul des montants des deux lignes.

### Guards et headers

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>` (obligatoire)
- `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **POST** : permission `budgets.update`
- **GET** : permission `budgets.read`

### POST /api/budget-reallocations

Crée une réallocation : transfert d’un montant de la ligne source vers la ligne cible (même budget, même client, lignes ACTIVE, budget non LOCKED/ARCHIVED, montant ≤ `remainingAmount` de la source).

**Body (JSON)**

| Champ           | Type   | Obligatoire | Description |
|-----------------|--------|-------------|-------------|
| `sourceLineId`  | string | oui         | ID de la ligne budgétaire source |
| `targetLineId`  | string | oui         | ID de la ligne budgétaire cible |
| `amount`        | number | oui         | Montant à transférer (> 0, ≤ remainingAmount de la source) |
| `reason`        | string | non         | Motif (max 500 caractères) ; normalisé (trim), stocké null si vide |

**Réponse 200** : objet mappé `{ id, budgetId, sourceLineId, targetLineId, amount, currency, reason, createdAt }` (amount en number).

**Erreurs :** 400 (validation, même ligne, budgets différents, devise différente, ligne non ACTIVE, budget LOCKED/ARCHIVED, montant > remaining), 401, 403, 404 (ligne introuvable ou hors client).

### GET /api/budget-reallocations

Liste les réallocations du client actif. **Query** : `budgetId`, `budgetLineId` (source ou cible), `dateFrom`, `dateTo` (sur `createdAt` ; si les deux fournis, `dateFrom` doit être ≤ `dateTo`), `limit` (défaut 20, max 100), `offset` (défaut 0). **Tri :** `createdAt` décroissant (plus récent en premier).

**Réponse 200** : `{ items, total, limit, offset }`. Chaque item : `{ id, budgetId, sourceLineId, targetLineId, amount, currency, reason, createdAt }` (amount en number).

**Erreurs :** 400 (dateFrom > dateTo), 401, 403.

### GET /api/budget-reallocations/:id

Détail d’une réallocation. **404** si absente ou hors client.

**Réponse 200** : `{ id, budgetId, sourceLineId, targetLineId, amount, currency, reason, createdAt }`.

**Erreurs :** 401, 403, 404.

---

## 18. Budget Reporting API — `/api/budget-reporting/*`

Référence : **RFC-016** (Budget Reporting API). Module **budget-reporting** : agrégations et KPI budgétaires en **lecture seule** (exercice, budget, enveloppe). Données calculées à partir de `BudgetLine` ; pas de conversion multi-devise (400 si plusieurs devises dans le périmètre).

### Guards et headers

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`
- `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- Permission : **`budgets.read`** pour toutes les routes

### Format des réponses

- **Summary** (exercice, budget, enveloppe) : objet KPI avec `totalInitialAmount`, `totalRevisedAmount`, `totalForecastAmount`, `totalCommittedAmount`, `totalConsumedAmount`, `totalRemainingAmount`, `consumptionRate`, `commitmentRate`, `forecastRate`, `varianceAmount`, `forecastGapAmount`, `budgetCount` / `envelopeCount` / `lineCount` (selon niveau), `overConsumedLineCount`, `overCommittedLineCount`, `negativeRemainingLineCount`, `currency` (string ou `null` si périmètre sans ligne).
- **Listes** : `{ "items": [...], "total": number, "limit": number, "offset": number }`. `limit` max **100** (query).
- **Ratios** : 0 si `revisedAmount` = 0 ; jamais `null`.
- **Search** : appliqué uniquement à `name` et `code` (budgets, enveloppes, lignes).

### GET /api/budget-reporting/exercises/:id/summary

KPI consolidés de l’exercice (toutes les lignes des budgets de l’exercice). **404** si exercice absent ou hors client. **400** si plusieurs devises dans les lignes.

---

### GET /api/budget-reporting/exercises/:id/budgets

Liste paginée des budgets de l’exercice avec KPI synthétiques par budget.

**Query (optionnels)** : `offset`, `limit` (max 100), `search` (name/code), `status` (BudgetStatus).

**Réponse 200** : `{ items, total, limit, offset }`. Chaque item : budget (id, name, code, currency, status, …) + `kpi` (BudgetSummaryKpi).

**Erreurs :** 401, 403, 404 (exercice), 400 (multi-devise dans un budget).

---

### GET /api/budget-reporting/budgets/:id/summary

KPI consolidés du budget. **404** si budget absent. **400** si plusieurs devises. Si aucune ligne : `currency` = `budget.currency`.

---

### GET /api/budget-reporting/budgets/:id/envelopes

Liste paginée des enveloppes du budget avec KPI par enveloppe.

**Query (optionnels)** : `offset`, `limit` (max 100), `type` (BudgetEnvelopeType), `parentId`, `includeChildren` (bool).

**Réponse 200** : `{ items, total, limit, offset }`. Chaque item : enveloppe + `kpi`.

**Erreurs :** 401, 403, 404 (budget), 400 (multi-devise).

---

### GET /api/budget-reporting/budgets/:id/breakdown-by-type

Répartition des montants par type d’enveloppe (RUN, BUILD, TRANSVERSE). Tableau d’objets `{ type, totalInitialAmount, totalRevisedAmount, totalForecastAmount, totalCommittedAmount, totalConsumedAmount, totalRemainingAmount, lineCount }`.

**Erreurs :** 401, 403, 404 (budget), 400 (multi-devise).

### GET /api/budget-reporting/budgets/:id/totals-by-cost-center (RFC-021)

Totaux par centre de coûts. **Seules les lignes `allocationScope = ANALYTICAL`** sont prises en compte. Pour chaque centre : contribution = `lineAmount * percentage / 100` ; `lineAmount` = `revisedAmount` pour total révisé, `remainingAmount` pour restant. Réponse : `{ currency, items: [{ costCenterId, costCenterCode, costCenterName, totalRevisedAmount, totalRemainingAmount }] }`.

### GET /api/budget-reporting/budgets/:id/totals-by-general-ledger-account (RFC-021)

Totaux par compte comptable. **Toutes les lignes** (ENTERPRISE + ANALYTICAL). Agrégation par `generalLedgerAccountId`. Réponse : `{ currency, items: [{ generalLedgerAccountId, generalLedgerAccountCode, generalLedgerAccountName, totalRevisedAmount, totalRemainingAmount }] }`.

---

### GET /api/budget-reporting/envelopes/:id/summary

KPI consolidés de l’enveloppe. **Query** : `includeChildren` (bool) pour inclure les sous-enveloppes. **404** si enveloppe absente. Si aucune ligne : `currency` = devise du budget parent ou `null`.

---

### GET /api/budget-reporting/envelopes/:id/lines

Liste paginée des lignes de l’enveloppe avec montants, ratios et indicateurs d’alerte par ligne.

**Query (optionnels)** : `offset`, `limit` (max 100), `search` (name/code), `status` (BudgetLineStatus).

**Réponse 200** : `{ items, total, limit, offset }`. Chaque item : ligne + `consumptionRate`, `commitmentRate`, `forecastRate`, `overConsumed`, `overCommitted`, `negativeRemaining`.

**Erreurs :** 401, 403, 404 (enveloppe).

---

## 18.1 Budget Dashboard API — GET /api/budget-dashboard

Référence : **RFC-022** (Budget Dashboard API). Module **budget-dashboard** : cockpit de pilotage budgétaire en **lecture seule**. Retourne une vue synthétique (KPI, RUN/BUILD/TRANSVERSE, compteurs d’alertes par ligne, répartition CAPEX/OPEX, tendance mensuelle, top enveloppes, enveloppes à risque, top lignes, lignes critiques) pour alimenter le dashboard Finance. Données dérivées de BudgetLine et FinancialEvent (tendance) ; scopées par client actif.

**Frontend** : consommation par `GET /api/budget-dashboard`, page `/budgets/dashboard` — voir [docs/modules/budget-cockpit.md](modules/budget-cockpit.md) (KPI, tableaux, ouverture du panneau intelligence ligne sur les lignes `topBudgetLines` / `criticalBudgetLines`).

### Guards et headers

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>`
- `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- Permission : **`budgets.read`**

### GET /api/budget-dashboard

Retourne la vue globale du cockpit budgétaire pour un budget résolu (ou l’exercice courant si aucun paramètre).

**Query (tous optionnels)**

| Paramètre           | Type    | Description |
|---------------------|---------|-------------|
| `exerciseId`        | string  | ID de l’exercice. Si fourni avec `budgetId`, `budgetId` est prioritaire. |
| `budgetId`          | string  | ID du budget. Si fourni, l’exercice est déduit du budget. |
| `includeEnvelopes`  | boolean | Inclure `topEnvelopes` et `riskEnvelopes`. Défaut : true. En query, passer `true`/`false` (chaîne convertie en booléen). |
| `includeLines`      | boolean | Inclure `topBudgetLines` et `criticalBudgetLines`. Défaut : true. |

**Résolution du budget**

- Si `budgetId` fourni : charger ce budget (scope client) ; 404 si absent. Exercice = budget.exerciseId.
- Si `exerciseId` fourni : charger l’exercice ; budget = budget versionné actif (BudgetVersionSet.activeBudgetId) si présent, sinon budget avec status ACTIVE, sinon budget le plus récent de l’exercice ; 404 si aucun budget.
- Si aucun paramètre : exercice courant = ACTIVE et endDate ≥ now (sinon exercice le plus récent par endDate) ; puis même logique de résolution du budget ; 404 si aucun exercice ou aucun budget.

**Réponse 200**

```json
{
  "exercise": {
    "id": "string",
    "name": "string",
    "code": "string | null"
  },
  "budget": {
    "id": "string",
    "name": "string",
    "code": "string | null",
    "currency": "string",
    "status": "string"
  },
  "kpis": {
    "totalBudget": 0,
    "committed": 0,
    "consumed": 0,
    "forecast": 0,
    "remaining": 0,
    "consumptionRate": 0
  },
  "runBuildDistribution": { "run": 0, "build": 0, "transverse": 0 },
  "alertsSummary": {
    "negativeRemaining": 0,
    "overCommitted": 0,
    "overConsumed": 0,
    "forecastOverBudget": 0
  },
  "capexOpexDistribution": { "capex": 0, "opex": 0 },
  "monthlyTrend": [
    { "month": "YYYY-MM", "committed": 0, "consumed": 0 }
  ],
  "topEnvelopes": [
    {
      "envelopeId": "string",
      "code": "string | null",
      "name": "string",
      "totalBudget": 0,
      "consumed": 0,
      "remaining": 0
    }
  ],
  "riskEnvelopes": [
    {
      "envelopeId": "string",
      "code": "string | null",
      "name": "string",
      "forecast": 0,
      "budgetAmount": 0,
      "riskRatio": 0,
      "riskLevel": "LOW | MEDIUM | HIGH"
    }
  ],
  "topBudgetLines": [
    {
      "lineId": "string",
      "code": "string | null",
      "name": "string",
      "envelopeName": "string | null",
      "revisedAmount": 0,
      "committed": 0,
      "consumed": 0,
      "forecast": 0,
      "remaining": 0,
      "lineRiskLevel": "OK | WARNING | CRITICAL"
    }
  ],
  "criticalBudgetLines": [
    {
      "lineId": "string",
      "code": "string | null",
      "name": "string",
      "envelopeName": "string | null",
      "revisedAmount": 0,
      "committed": 0,
      "consumed": 0,
      "forecast": 0,
      "remaining": 0,
      "lineRiskLevel": "WARNING | CRITICAL"
    }
  ]
}
```

- `topEnvelopes` et `riskEnvelopes` sont **absents** si `includeEnvelopes=false`.
- `topBudgetLines` et `criticalBudgetLines` sont **absents** si `includeLines=false`.
- KPI : `totalBudget` = SUM(BudgetLine.revisedAmount), `remaining` = SUM(BudgetLine.remainingAmount), committed/consumed/forecast = SUM des montants sur BudgetLine, `consumptionRate` = consumed / totalBudget (0 si totalBudget = 0).
- `runBuildDistribution` : sommes de `revisedAmount` par `BudgetEnvelope.type` (RUN / BUILD / TRANSVERSE).
- `alertsSummary` : nombre de lignes vérifiant respectivement `remaining < 0`, `committed > revisedAmount`, `consumed > revisedAmount`, `forecast > revisedAmount`.
- `lineRiskLevel` (ligne) : CRITICAL si reste négatif, consommé ou forecast au-dessus du révisé ; WARNING si engagé au-dessus du révisé sans condition CRITICAL ; sinon OK.
- Risk (enveloppe) : `riskRatio` = forecast / budgetAmount par enveloppe ; LOW &lt; 0,70, MEDIUM 0,70–0,90, HIGH &gt; 0,90.
- Top enveloppes et top lignes : tri par consommé décroissant, au plus 10 éléments chacun. `criticalBudgetLines` : lignes non OK, tri gravité puis consommation, au plus 10.

**Erreurs :** 401, 403, 404 (exercice ou budget introuvable dans le scope client).

---

## 19. Budget Data Import — `/api/budget-imports/*`, `/api/budget-import-mappings`

Référence : **RFC-018** (Budget Data Import). Import de données budgétaires depuis fichiers Excel (`.xlsx`) ou CSV (`.csv`) : analyse, mapping des colonnes, prévisualisation, exécution transactionnelle avec anti-doublon (externalId ou clé composite) et traçabilité via `BudgetImportRowLink`.

### Guards et headers

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>` (obligatoire)
- `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **analyze**, **preview** : permission `budgets.read`
- **execute**, CRUD **budget-import-mappings** : permission `budgets.update`

Règle MVP : **seul l’utilisateur ayant uploadé le fichier** peut appeler preview ou execute avec le `fileToken` retourné par analyze (sinon 403).

### Contraintes

- Taille max fichier : **10 MB**
- Nombre max de lignes : **20 000**
- CSV : UTF-8, séparateurs `,` ou `;`
- Excel : une feuille à la fois

### POST /api/budget-imports/analyze

Envoi du fichier pour analyse (détection des colonnes, échantillon, volume).

**Body** : `multipart/form-data`, champ **`file`** (fichier `.csv` ou `.xlsx`).

**Réponse 200**

```json
{
  "fileToken": "abc123...",
  "sourceType": "XLSX",
  "sheetNames": ["Feuil1"],
  "columns": ["Date", "Montant", "Fournisseur", "N° pièce"],
  "sampleRows": [ { "Date": "2026-01-01", "Montant": "1000", ... } ],
  "rowCount": 1250
}
```

**Erreurs :** 400 (fichier manquant, taille > 10 MB, extension non autorisée), 401, 403.

---

### POST /api/budget-imports/preview

Prévisualisation de l’import sans écriture en base. Le `fileToken` doit appartenir au client actif, ne pas être expiré, et correspondre à l’utilisateur connecté (uploader).

**Body (JSON)**

| Champ       | Type   | Obligatoire | Description |
|------------|--------|-------------|-------------|
| `budgetId` | string | oui         | ID du budget cible |
| `fileToken`| string | oui         | Token retourné par analyze |
| `mapping`  | object | oui         | MappingConfig (fields, matching?, defaults?) |
| `options`  | object | non         | defaultEnvelopeId, **defaultGeneralLedgerAccountId** (RFC-021 : compte comptable pour lignes créées ; sinon compte client code 999999), defaultCurrency, importMode, ignoreEmptyRows, trimValues, dateFormat?, decimalSeparator? |

**Réponse 200**

```json
{
  "stats": {
    "totalRows": 1250,
    "createRows": 1120,
    "updateRows": 98,
    "skipRows": 12,
    "errorRows": 20
  },
  "previewRows": [
    { "rowIndex": 1, "status": "CREATE", "reason": "NO_MATCH_CREATE", "data": { ... } }
  ],
  "warnings": [],
  "errors": []
}
```

Statuts par ligne : `CREATE`, `UPDATE`, `SKIP`, `ERROR`. Motifs possibles : `MATCHED_BY_EXTERNAL_ID`, `MATCHED_BY_COMPOSITE_KEY`, `NO_MATCH_CREATE`, `NO_MATCH_UPDATE_ONLY`, `MISSING_ENVELOPE`, `INVALID_AMOUNT`, `INVALID_DATE`, `MISSING_REQUIRED_FIELD`, `DUPLICATE_SOURCE_KEY`, `AMBIGUOUS_MATCH`.

**Erreurs :** 400 (validation), 401, 403 (fileToken invalide ou non uploader), 404 (fichier expiré ou budget introuvable).

---

### POST /api/budget-imports/execute

Exécution de l’import (création/mise à jour de `BudgetLine`, création de `BudgetImportRowLink`, job en base). Préparation hors transaction ; écritures en une seule transaction Prisma.

**Body (JSON)**

| Champ       | Type   | Obligatoire | Description |
|------------|--------|-------------|-------------|
| `budgetId` | string | oui         | ID du budget cible |
| `fileToken`| string | oui         | Token retourné par analyze |
| `mappingId`| string | non         | ID d’un mapping sauvegardé (optionnel) |
| `mapping`  | object | oui         | MappingConfig |
| `options`  | object | non         | Options d’import (voir preview) |

**Réponse 200**

```json
{
  "jobId": "job_001",
  "status": "COMPLETED",
  "totalRows": 1250,
  "createdRows": 1120,
  "updatedRows": 98,
  "skippedRows": 12,
  "errorRows": 20
}
```

`summary` du job (en base) : structure minimale `{ "warningsCount": number, "errorsByType": Record<string, number> }`.

**Erreurs :** 400 (validation), 401, 403 (fileToken invalide ou non uploader), 404 (fichier expiré ou budget introuvable).

---

### CRUD Budget Import Mappings — `/api/budget-import-mappings`

Mappings sauvegardés (configuration colonnes → champs logiques, stratégie de rapprochement, options). Tous scopés au client actif.

- **GET /api/budget-import-mappings** — Liste (query : `limit`, `offset`). Permission `budgets.read`.
- **POST /api/budget-import-mappings** — Création (name, description?, sourceType, entityType?, sheetName?, headerRowIndex?, mappingConfig, optionsConfig?). Permission `budgets.update`.
- **GET /api/budget-import-mappings/:id** — Détail. Permission `budgets.read`.
- **PATCH /api/budget-import-mappings/:id** — Mise à jour partielle. Permission `budgets.update`.
- **DELETE /api/budget-import-mappings/:id** — Suppression. Permission `budgets.update`.

**Erreurs :** 401, 403, 404 (mapping introuvable ou hors client).

---

## 20. Budget Versioning (RFC-019) — `/api/budget-version-sets`, `/api/budgets/:id/*`

Référence : **RFC-019** (Budget Versioning). Gestion des versions de budgets : ensembles de versions (BudgetVersionSet), baseline, révisions, version active, comparaison entre versions. Duplication transactionnelle de la structure Budget / BudgetEnvelope / BudgetLine (sans clonage des allocations ni événements financiers).

### Guards et headers

- **Headers** : `Authorization: Bearer <accessToken>`, `X-Client-Id`
- **Guards** : JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard
- **Permissions** : `budgets.read` (GET), `budgets.create` (create-baseline, create-revision), `budgets.update` (activate-version, archive-version)

### Budget Version Sets — `/api/budget-version-sets`

- **GET /api/budget-version-sets** — Liste des ensembles de versions du client actif. Query : `exerciseId?`, `search?`, `offset?`, `limit?`. Réponse : `{ items, total, limit, offset }` avec pour chaque item : `id`, `clientId`, `exerciseId`, `code`, `name`, `description`, `baselineBudgetId`, `activeBudgetId`, `createdAt`. Permission `budgets.read`.
- **GET /api/budget-version-sets/:id** — Détail d’un ensemble : métadonnées + `baseline`, `active`, liste `versions` (triées par `versionNumber`). Permission `budgets.read`.

### Actions sur un budget — `/api/budgets/:id/...`

- **POST /api/budgets/:id/create-baseline** — Crée un version set et une baseline (V1) par copie du budget existant (non versionné). Réponse : `versionSetId`, `budgetId`, `versionNumber`, `versionLabel`, `versionKind`, `versionStatus`. Permission `budgets.create`.
- **POST /api/budgets/:id/create-revision** — Crée une nouvelle révision (duplication). Body optionnel : `label?`, `description?`. Réponse : `versionSetId`, `budgetId`, `versionNumber`, `versionLabel`, `versionKind`, `versionStatus`, `parentBudgetId`. Permission `budgets.create`.
- **POST /api/budgets/:id/activate-version** — Marque la version comme active (l’ancienne active du même set passe en SUPERSEDED). Idempotent si déjà active. Permission `budgets.update`.
- **POST /api/budgets/:id/archive-version** — Archive une version non active. Interdit d’archiver la baseline si elle est la seule version du set. Permission `budgets.update`.
- **GET /api/budgets/:id/version-history** — Historique des versions du set (liste triée par `versionNumber`). Permission `budgets.read`.
- **GET /api/budgets/:id/compare?targetBudgetId=...** — Comparaison entre deux versions du même set. Query requise : `targetBudgetId`. Réponse : `sourceBudgetId`, `targetBudgetId`, `lines` (diff par code de ligne : source, target, delta des montants). Permission `budgets.read`.

**Erreurs :** 400 (budget déjà versionné, pas le même set pour compare, archivage baseline unique, etc.), 401, 403, 404.

---

## 21. Module Projets (RFC-PROJ-001 MVP) — `/api/projects`, `/api/projects/:projectId/tasks|task-buckets|gantt|activities|risks|milestones|budget-links|project-sheet|reviews|documents`, `/api/projects/:projectId/microsoft-link`

Référence : **RFC-PROJ-001**, **RFC-PROJ-010** (liens budget), **RFC-PROJ-011** (tâches enrichies, jalons, activités, payload **`GET /gantt`**), **RFC-PROJ-012** — *deux livrables distincts dans le dépôt* : [fiche décisionnelle Project Sheet](RFC/RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) et [UI Gantt Tâches et Jalons](RFC/RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md), **RFC-PROJ-013** (points projet COPIL/COPRO), **RFC-PROJ-DOC-001** (registre `ProjectDocument`), détail : [docs/modules/projects-mvp.md](modules/projects-mvp.md).

### Guards et headers

- **Headers** : `Authorization: Bearer <accessToken>`, `X-Client-Id` (client actif)
- **Guards** : JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard
- **Module** : code `projects` (activation par client)

### Projets — `/api/projects`

- **GET /api/projects** — Liste **paginée et enrichie** (pilotage calculé côté serveur : `derivedProgressPercent`, `computedHealth`, `signals`, `warnings`, compteurs).  
  Query : `page`, `limit`, `search`, `status`, `priority`, `criticality`, `sortBy` (`name` \| `targetEndDate` \| `status` \| `priority` \| `criticality` \| `computedHealth` \| `progressPercent`), `sortOrder` (`asc` \| `desc`), `atRiskOnly` (booléen).  
  Réponse : `{ items, total, page, limit }`. Permission **`projects.read`**.
- **GET /api/projects/portfolio-summary** — KPI agrégés sur **tous** les projets du client actif (sans pagination liste). Permission **`projects.read`**.
- **GET /api/projects/assignable-users** — Membres **actifs** du client (id, email, nom) pour désigner un responsable projet sans exiger le rôle client admin. Permission **`projects.read`**.
- **POST /api/projects** — Création (DTO validé : `name`, `code`, `type`, `priority`, `criticality`, champs optionnels dates, `progressPercent`, `ownerUserId`, etc.). Permission **`projects.create`**.
- **GET /api/projects/:id** — Détail enrichi (même enrichissement pilotage que la liste + champs étendus description, notes, etc.). Permission **`projects.read`**.
- **PATCH /api/projects/:id** — Mise à jour partielle. Permission **`projects.update`**.
- **DELETE /api/projects/:id** — Suppression. Permission **`projects.delete`**.

### Fiche projet décisionnelle (RFC-PROJ-012) — `/api/projects/:id/project-sheet`

- **GET /api/projects/:id/project-sheet** — Fiche enrichie (scores, ROI, priorité, cadrage, SWOT/TOWS, arbitrage multi-niveaux, etc.). Isolation **client actif**. Permission **`projects.read`**.
- **PATCH /api/projects/:id/project-sheet** — Mise à jour partielle (`UpdateProjectSheetDto`) : champs fiche, dont `type` / `status` projet, arbitrage à trois niveaux (`ProjectArbitrationLevelStatus` : notamment `BROUILLON`, `EN_COURS`, `SOUMIS_VALIDATION`, `VALIDE`, `REFUSE`) et motifs de refus si refus ; recalcul serveur de ROI / `priorityScore` selon règles du service. Audit **`project.sheet.updated`** si diff. Permission **`projects.update`**.
- **POST /api/projects/:id/arbitration** — Mise à jour du statut d’arbitrage **legacy** (`ProjectArbitrationStatus`). Audits **`project.arbitration.validated`** / **`project.arbitration.rejected`** selon cas. Permission **`projects.update`**.

### Points projet (RFC-PROJ-013) — `/api/projects/:projectId/reviews`

Isolation **client actif** + `projectId` dans l’URL ; le seul `reviewId` ne suffit pas à cibler une ressource.

- **GET /api/projects/:projectId/reviews** — Liste des points (tri par `reviewDate` desc, `createdAt` desc). Items **sans** `snapshotPayload` (charge allégée). **`projects.read`**
- **POST /api/projects/:projectId/reviews** — Création en brouillon (`ProjectReviewType`, `reviewDate`, `title`, `executiveSummary`, `contentPayload` optionnel, participants, etc.). **`projects.update`**
- **GET /api/projects/:projectId/reviews/:reviewId** — Détail. `snapshotPayload` **toujours présent** dans le JSON : `null` si `status !== FINALIZED`, objet figé si finalisé. **`projects.read`**
- **PATCH /api/projects/:projectId/reviews/:reviewId** — Mise à jour **uniquement** en statut brouillon. **`projects.update`**
- **POST /api/projects/:projectId/reviews/:reviewId/finalize** — Finalisation : snapshot serveur en transaction, statut `FINALIZED`. Audits **`project.review.finalized`**. **`projects.update`**
- **POST /api/projects/:projectId/reviews/:reviewId/cancel** — Annulation depuis brouillon. Audit **`project.review.cancelled`**. **`projects.update`**

Audits complémentaires : **`project.review.created`**, **`project.review.updated`**.

### Documents projet (RFC-PROJ-DOC-001) — `/api/projects/:projectId/documents`

Registre métier **sans** upload ni téléchargement binaire côté API MVP. Isolation **client actif** + `projectId` dans l’URL ; lectures excluent les documents en statut `DELETED`.

- **GET** — Liste (`status != DELETED`, tri `updatedAt` desc puis `createdAt` desc). **`projects.read`**
- **GET /api/projects/:projectId/documents/:documentId** — Détail. **`projects.read`**
- **POST** — Création (`CreateProjectDocumentDto`) : MVP **`storageType`** `STARIUM` \| `EXTERNAL` uniquement (`STARIUM` ⇒ `storageKey` requis ; `EXTERNAL` ⇒ `externalUrl` URL valide). **`projects.update`**
- **PATCH /api/projects/:projectId/documents/:documentId** — Métadonnées (`name`, `category`, `description`, `tags`) ; pas de `status` via PATCH. Audit **`project.document.updated`** si diff. **`projects.update`**
- **POST /api/projects/:projectId/documents/:documentId/archive** — `ARCHIVED` + `archivedAt` (idempotent si déjà archivé). Audit **`project.document.archived`**. **`projects.update`**
- **DELETE /api/projects/:projectId/documents/:documentId** — Suppression logique `DELETED` + `deletedAt` (idempotent si déjà supprimé). Audit **`project.document.deleted`**. **`projects.update`**

Audits : **`project.document.created`**, **`project.document.updated`**, **`project.document.archived`**, **`project.document.deleted`**.

### Lien Microsoft projet (RFC-PROJ-INT-007 / RFC-PROJ-INT-008 / RFC-PROJ-INT-009 / RFC-PROJ-INT-016) — `/api/projects/:projectId/microsoft-link`

Configuration du lien projet ↔ Teams / Planner / drive fichiers ; sync **manuelle** vers Planner (tâches) et vers le **drive** SharePoint du canal (documents). **Isolation** : `projectId` + **client actif** ; pas de `clientId` dans le body.

**Guards** : `JwtAuthGuard`, `ActiveClientGuard`, `MicrosoftIntegrationAccessGuard`, `@RequirePermissions('projects.update')` (même logique d’accès Microsoft que les routes `/api/microsoft/*` — voir section Intégration Microsoft 365).

- **GET** — Lecture config `ProjectMicrosoftLink` (404 si non créée). **`projects.read`**
- **PUT** — Création / mise à jour (`UpdateProjectMicrosoftLinkDto`) : `isEnabled`, `teamId`, `channelId`, `plannerPlanId`, `syncTasksEnabled`, `syncDocumentsEnabled`, `useMicrosoftPlannerBuckets` (remplace les buckets Starium par l’import des buckets du plan Planner — RFC-PROJ-OPT-001), `filesDriveId`, `filesFolderId`, libellés optionnels. **`projects.update`**
- **POST /api/projects/:projectId/microsoft-link/sync-tasks** — Sync bidirectionnelle des tâches (Phase A `Planner -> Starium`, puis Phase B `Starium -> Planner`, arrêt au premier échec, `lastSyncAt` mis à jour uniquement en succès complet). Contrat de réponse : `{ projectId, status, summary: { plannerTasksRead, createdInStarium, updatedInStarium, syncedToPlanner, conflictsResolvedByStarium, errors }, lastSyncAt }`. Audits : **`project.microsoft_tasks.bidirectional_sync_started`**, **`project.microsoft_tasks.imported`**, **`project.microsoft_tasks.updated_from_microsoft`**, **`project.microsoft_tasks.conflict_resolved_starium_wins`**, **`project.microsoft_tasks.bidirectional_sync_completed`**, **`project.microsoft_sync.failed`**. **`projects.update`**
- **POST /api/projects/:projectId/microsoft-link/sync-documents** — Sync one-way des `ProjectDocument` **STARIUM** (fichiers lus via `PROJECT_DOCUMENTS_STORAGE_ROOT`) vers le dossier `starium-project-{projectId}` du drive configuré. Réponse `{ total, synced, failed, skipped }`. Audits **`project.microsoft_documents.synced`** ou **`project.microsoft_sync.failed`**. **`projects.update`**

**UI (RFC-PROJ-OPT-001)** : page **`/projects/[projectId]/options`** (`apps/web/src/features/projects/options/`) — paramètres projet (réutilise **`PATCH /api/projects/:id`**), onglet Planning (buckets), configuration et état de la liaison (routes ci-dessus), connexion Microsoft côté client (**`GET /api/microsoft/connection`**, démarrage OAuth **`GET /api/microsoft/auth/url`** → lecture de l’URL dans la réponse → redirection). Isolation **client actif** inchangée (header `X-Client-Id`).

### Buckets planning — `/api/projects/:projectId/task-buckets` (RFC-PROJ-OPT-001)

Ressource **`ProjectTaskBucket`** par projet ; lecture de `useMicrosoftPlannerBuckets` sur la liaison Microsoft dans la réponse **GET**. Si les buckets proviennent du plan Planner, création / mise à jour / suppression manuelle côté API est refusée (colonnes gérées dans Teams / Planner).

- **GET** — `{ items, useMicrosoftPlannerBuckets }`. **`projects.read`**
- **POST** — Création (`CreateProjectTaskBucketDto`). **`projects.update`**
- **PATCH /api/projects/:projectId/task-buckets/:bucketId** — **`projects.update`**
- **DELETE** — **`projects.update`**

### Tâches — `/api/projects/:projectId/tasks` (RFC-PROJ-011)

Isolation **client actif** ; pas de `DELETE` sur tâche au MVP (effets de bord jalons / revues / activités). Listes paginées : réponse `{ items, total, limit, offset }` (query filtres selon implémentation : statut, parent, dates, etc.).

- **GET** — Liste paginée des tâches du projet. **`projects.read`**
- **POST** — Création (champs dont `bucketId` optionnel — référence un `ProjectTaskBucket` du même projet). **`projects.update`** (mutation du périmètre projet)
- **GET /api/projects/:projectId/tasks/:id** — Détail d’une tâche. **`projects.read`**
- **PATCH /api/projects/:projectId/tasks/:id** — (champs dont `bucketId` optionnel). **`projects.update`**

### Gantt-ready — `/api/projects/:projectId/gantt` (RFC-PROJ-011)

- **GET** — Agrégat **tâches + jalons** pour l’UI Gantt (les **activités** ne font pas partie de ce payload). **`projects.read`** — consommé par la route **`/projects/[projectId]/planning`** (voir [RFC-PROJ-012 — Gantt Tâches et Jalons](RFC/RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md)).

### Activités — `/api/projects/:projectId/activities` (RFC-PROJ-011)

`ProjectActivity` : `projectId` obligatoire (MVP), dérivée d’une tâche source ; hors payload `/gantt`.

- **GET** — Liste paginée `{ items, total, limit, offset }`. **`projects.read`**
- **POST** — Création. **`projects.update`**
- **GET /api/projects/:projectId/activities/:id** — Détail. **`projects.read`**
- **PATCH /api/projects/:projectId/activities/:id** — **`projects.update`**

### Risques — `/api/projects/:projectId/risks`

- **GET** — Liste. **`projects.read`**
- **POST** — **`projects.update`**
- **PATCH /api/projects/:projectId/risks/:id** — **`projects.update`**
- **DELETE /api/projects/:projectId/risks/:id** — **`projects.update`**

### Jalons — `/api/projects/:projectId/milestones`

- **GET** — Liste paginée `{ items, total, limit, offset }` (RFC-PROJ-011). **`projects.read`**
- **POST** — **`projects.update`**
- **PATCH /api/projects/:projectId/milestones/:id** — **`projects.update`**
- **DELETE /api/projects/:projectId/milestones/:id** — **`projects.update`**

### Liens projet ↔ ligne budgétaire (RFC-PROJ-010) — module Nest `project-budget`

- **GET /api/projects/:projectId/budget-links** — Liste paginée des liens (`query` : `limit` défaut 20 max 100, `offset`). Réponse `{ items, total, limit, offset }`. **`projects.read`**
- **POST /api/projects/:projectId/budget-links** — Création d’un lien (`budgetLineId`, `allocationType` : `FULL` \| `PERCENTAGE` \| `FIXED`, champs optionnels `percentage` / `amount` selon le mode). **`projects.update`**
- **DELETE /api/project-budget-links/:id** — Suppression (204 si OK). **`projects.update`**

**Erreurs :** 400 (invariant allocation, DTO), 409 (budget/exercice fermé, ligne non ACTIVE, doublon `(projectId, budgetLineId)`, suppression laissant un résidu incohérent), 404 (hors scope client).

**Erreurs courantes (reste du module projets) :** 401, 403 (module inactif ou permission manquante), 404 (projet ou sous-ressource hors périmètre client), 409 (ex. code projet déjà utilisé).

---

## Intégration Microsoft 365 — `/api/microsoft` (RFC-PROJ-INT-003 / RFC-PROJ-INT-005)

Toutes les routes ci-dessous sont préfixées par **`/api`**. Les jetons Microsoft (**access** / **refresh**) ne sont **jamais** renvoyés au client : ils sont stockés chiffrés côté serveur et associés au **client Starium** concerné — **`clientId` du contexte client actif** sur les routes JWT, **`clientId` issu du `state` validé** sur le callback OAuth (pas d’`clientId` dans le body des requêtes).

**Accès (routes authentifiées ci-dessous)** : **`ClientUserRole.CLIENT_ADMIN`** sur le client actif **ou**, à défaut, module **Projets** actif pour le client + permission métier **`projects.update`** (`MicrosoftIntegrationAccessGuard`).

**UX** : **Administration client** → `/client/administration/microsoft-365` — accès aligné sur les mêmes règles que ci-dessus : **administrateur du client** **ou** utilisateur avec **`projects.update`** (module Projets activé pour le client, vérifié côté API).

### GET /api/microsoft/auth/url

Démarre le flux OAuth délégué : retourne une URL de consentement Microsoft et un `state` signé (JWT Starium + `jti` anti-replay).

**Headers**

- `Authorization: Bearer <accessToken>`
- `X-Client-Id: <clientId>` (client actif)

**Permission :** `@RequirePermissions('projects.update')` si l’utilisateur n’est pas **client admin** (voir ci-dessus).

**Réponse 200**

```json
{
  "authorizationUrl": "https://login.microsoftonline.com/..."
}
```

---

### GET /api/microsoft/auth/callback

Callback **public** (redirect navigateur Microsoft). Pas de JWT. Paramètres query : `code`, `state` (succès) ou `error`, `error_description` (échec côté Microsoft). Rate limiting léger par IP. Réponse : **302** vers `MICROSOFT_OAUTH_SUCCESS_URL` ou `MICROSOFT_OAUTH_ERROR_URL` avec paramètres de query contrôlés (`microsoft`, `code`, etc.) — jamais de jetons dans l’URL.

---

### GET /api/microsoft/connection

État de la connexion Microsoft pour le **client actif** (une connexion `ACTIVE` par client en logique métier).

**Headers** : JWT + `X-Client-Id`

**Permission :** même règle que `GET .../auth/url`.

**Réponse 200**

```json
{
  "connection": {
    "id": "…",
    "tenantId": "…",
    "tenantName": null,
    "status": "ACTIVE",
    "tokenExpiresAt": "2025-01-01T12:00:00.000Z",
    "connectedByUserId": "…",
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

`connection` peut être `null` si aucune connexion active.

Les champs `accessTokenEncrypted` / `refreshTokenEncrypted` ne figurent **pas** dans la réponse.

---

### DELETE /api/microsoft/connection

Révocation logique de la connexion Microsoft pour le client actif (effacement des jetons en base après overwrite).

**Headers** : JWT + `X-Client-Id`

**Permission :** même règle que `GET .../auth/url`.

**Réponse 204** (No Content), idempotent si déjà absent.

---

### Configuration OAuth commune (plateforme) — `GET|PATCH /api/platform/microsoft-settings`

Paramètres **globaux** Starium : URI de redirection OAuth (callback `/api/microsoft/auth/callback`), scopes Microsoft Graph, URLs succès/erreur après callback, TTL `state`, marges refresh, timeout HTTP token. Repli sur variables d’environnement si la ligne `PlatformMicrosoftSettings` est vide.

**Guards** : `JwtAuthGuard`, `PlatformAdminGuard` — **pas** de `X-Client-Id` (le frontend ne l’envoie pas sur `/api/platform/*`).

**PATCH** : corps JSON partiel (`redirectUri`, `graphScopes`, `oauthSuccessUrl`, `oauthErrorUrl`, entiers optionnels pour TTL / timeouts). Réponse : même forme que **GET** (objets `stored` + `resolved`).

---

### Identifiants Azure AD par client Starium — `GET|PUT /api/clients/active/microsoft-oauth`

Lecture / mise à jour des champs **BYO** sur le `Client` actif : ID d’application, tenant d’autorité optionnel, secret (le secret n’est pas renvoyé en lecture ; indicateur `hasClientSecret`). Retourne aussi l’URI de redirection et les scopes **effectifs** issus de la config plateforme (`platformRedirectUri`, `graphScopes`).

**Headers** : JWT + **`X-Client-Id`** (obligatoire).

**Guards** : `ActiveClientGuard`, `MicrosoftIntegrationAccessGuard`, `@RequirePermissions('projects.update')` si l’utilisateur n’est pas **client admin** (même logique que `/api/microsoft/auth/url`).

**Réponse GET (200)** : champs métier sans secret en clair ; **PUT** : 200 avec corps aligné sur le GET.
