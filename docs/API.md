# API Starium Orchestra

Toutes les routes sont préfixées par **`/api`** (ex. `POST /api/auth/login`).

Références : RFC-002 (auth), RFC-SEC-001 (MFA Hardening & Recovery Codes), RFC-008 (gestion des utilisateurs), RFC-009 (gestion des clients), RFC-011 (rôles, permissions et modules), RFC-014-2 (GET /me avec platformRole), RFC-015-2 (Budget Management Backend), RFC-016 (Budget Reporting API), RFC-017 (Budget Reallocation), RFC-018 (Budget Data Import), RFC-019 (Budget Versioning), RFC-022 (Budget Dashboard API), RFC-032 (historique décisionnel budget — `GET /api/budgets/:budgetId/decision-history`), RFC-033 (versions figées / snapshots + types d’occasion), RFC-034 (GED procurement — pièces jointes PO/facture), RFC-035 (stockage procurement local + S3 optionnel, settings plateforme), RFC-023 — *Client RBAC Administration* (fichier distinct de *RFC-023 — Budget Prévisionnel*), RFC-TEAM-004 (associations collaborateur ↔ compétence), RFC-PROJ-001 (module Projets MVP), RFC-PROJ-INT-003 / RFC-PROJ-INT-005 (OAuth Microsoft 365), RFC-PROJ-INT-007 / RFC-PROJ-INT-008 / RFC-PROJ-INT-009 / RFC-PROJ-INT-016 (lien projet Microsoft, sync tâches, sync documents, sync bidirectionnelle tâches), RFC-ACL-012 (license reporting — `/api/platform/license-reporting`), RFC-038 (socle alertes, notifications in-app, file email async), **RFC-ACL-005** (`/api/resource-acl/*`), **RFC-ACL-011** (`/api/access-diagnostics/*`), **RFC-ACL-014** (`docs/ACCESS-MODEL.md`, self-diagnostic `effective-rights/me`, lockout ACL, guards mutations plateforme).

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
  "accessToken": "<access_token_JWT>",
  "refreshToken": "<refresh_token>"
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

### POST /api/auth/mfa/recovery/verify

Valide un code de secours (recovery code) pour un challenge MFA LOGIN actif. Endpoint dédié, indépendant du déchiffrement TOTP. Voir [RFC-SEC-001](RFC/RFC-SEC-001%20%E2%80%94%20MFA%20Hardening%20et%20Recovery%20Codes.md).

**Body (JSON)**

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `challengeId` | string | oui | ID du challenge MFA |
| `recoveryCode` | string | oui | Code de secours (hex, `[0-9A-Fa-f\s-]+`) |
| `trustDevice` | boolean | non | Confiance appareil 30 j |

**Réponse 200**

```json
{
  "status": "AUTHENTICATED",
  "accessToken": "...",
  "refreshToken": "...",
  "trustedDeviceToken": "..."
}
```

**Erreurs :** 400 (validation), 401 (code invalide, challenge expiré), 403 (trop de tentatives).

---

### POST /api/platform/users/:userId/reset-mfa

Reset MFA d’un utilisateur (supprime `UserMfa`, `MfaChallenge`, `TrustedDevice`, `RefreshToken`). L’utilisateur devra reconfigurer la 2FA à la prochaine connexion.

**Guards :** `JwtAuthGuard`, `PlatformAdminGuard`.

**Contraintes :** self-reset interdit (`403`), MFA doit être activée sur le compte cible (`400`).

**Réponse 204** (No Content).

**Audit :** `admin.mfa.reset` (`adminUserId`, `targetUserId`, `targetEmail`, IP, UA).

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

La réponse peut inclure les champs licence sur le lien client (`licenseType`, `licenseBillingMode`, `subscriptionId`, `licenseStartsAt`, `licenseEndsAt`, `licenseAssignmentReason`) lorsque le backend les expose pour ce client.

---

### GET /api/platform/clients/:clientId/users

Liste des membres du client identifié par **`clientId`** (même agrégat User + `ClientUser` que `GET /api/users`, y compris les champs licence ci-dessus).

**Guards :** **`JwtAuthGuard`** + **`PlatformAdminGuard`** uniquement. **Pas** d’`ActiveClientGuard` et **pas** d’en-tête **`X-Client-Id`** : le périmètre est explicitement `:clientId` dans l’URL (plateforme).

**Headers**

- `Authorization: Bearer <accessToken>`

**Réponse 200** : tableau au même format que `GET /api/users`.

**Erreurs :** `401` (non authentifié), `403` (non plateforme admin), `404` si le client n’existe pas.

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
En parallèle, le stockage **documents** (pièces procurement/contrats) est provisionné : **dossier** sous la racine locale si le driver est `local`, ou **bucket S3** dédié si le driver est `s3` (échec → rollback de la création client).  
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

### Client actif — réglages workflow budget — `GET|PATCH /api/clients/active/budget-workflow-settings`

Paramètres **scopés au client actif** (`X-Client-Id`). Pas d’admin plateforme requis.

**Guards :** `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`

| Méthode | Permission |
|---------|------------|
| **GET** | `budgets.read` |
| **PATCH** | `budgets.update` |

**GET — réponse 200**

```json
{
  "stored": null,
  "resolved": {
    "requireEnvelopesNonDraftForBudgetValidated": true,
    "snapshotIncludedBudgetLineStatuses": ["PENDING_VALIDATION", "ACTIVE", "REJECTED", "DEFERRED", "CLOSED", "ARCHIVED"]
  }
}
```

- **`stored`** : overrides persistés en base pour ce client (`null` si aucune personnalisation ; JSON sparse, clés métier uniquement).
- **`resolved`** : valeur effective après fusion avec les **défauts applicatifs** — le frontend doit s’appuyer sur **`resolved`** pour l’affichage.
- **`snapshotIncludedBudgetLineStatuses`** : liste blanche des valeurs `BudgetLineStatus` dont les **lignes** sont incluses dans une **version figée** (`POST /api/budget-snapshots`, captures auto workflow). **Défaut** : tous les statuts **sauf** `DRAFT` (le client peut ajouter `DRAFT` via PATCH). Au moins un statut si le champ est envoyé en PATCH.

**PATCH — body (JSON)** — champs optionnels (mise à jour partielle)

| Champ | Type | Description |
|-------|------|-------------|
| `requireEnvelopesNonDraftForBudgetValidated` | boolean | Si `true` (défaut), le passage du budget à **`VALIDATED`** est refusé tant qu’une enveloppe du budget est en **`DRAFT`**. Si `false`, cette garde est désactivée pour ce client. |
| `snapshotIncludedBudgetLineStatuses` | `BudgetLineStatus[]` | Statuts de ligne budgétaire à inclure dans les versions figées. **Min. 1** élément si le champ est présent. Défaut résolu : tous sauf **`DRAFT`**. |

Propriétés inconnues dans le body → **400** (`forbidNonWhitelisted`).

**PATCH — réponse 200** : même forme que le **GET** (`stored` + `resolved`) après écriture.

---

## 5. Résumé des guards et headers

| Contexte          | Headers requis                                    | Guards (ordre)                                              |
|-------------------|----------------------------------------------------|-------------------------------------------------------------|
| Auth              | —                                                  | —                                                           |
| /api/me           | `Authorization: Bearer <accessToken>`             | JwtAuthGuard                                                |
| /api/users        | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard         |
| /api/resource-acl/:resourceType/:resourceId (GET) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard |
| /api/resource-acl/:resourceType/:resourceId/access-policy (PATCH) | idem | JwtAuthGuard → ActiveClientOrPlatformContextGuard → ClientAdminOrPlatformAdminGuard ; query `force=true` réservée `PLATFORM_ADMIN` (RFC-ACL-014) — RFC-ACL-017 |
| /api/resource-acl/:resourceType/:resourceId (PUT), …/entries (POST), …/entries/:id (DELETE) | idem | JwtAuthGuard → ActiveClientOrPlatformContextGuard → ClientAdminOrPlatformAdminGuard ; query optionnelle `force=true` réservée `PLATFORM_ADMIN` (RFC-ACL-014) |
| /api/access-diagnostics/effective-rights/me | idem | JwtAuthGuard → ActiveClientGuard (self-service membre) |
| /api/roles        | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard         |
| /api/permissions  | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ClientAdminGuard         |
| /api/clients      | `Authorization: Bearer <accessToken>`             | JwtAuthGuard → PlatformAdminGuard                           |
| /api/modules      | `Authorization: Bearer <accessToken>`             | JwtAuthGuard → PlatformAdminGuard                           |
| /api/audit-logs   | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard |
| /api/test-rbac    | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard |
| /api/clients/active/budget-workflow-settings | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.update`) |
| /api/budget-exercises, /api/budgets, /api/budget-envelopes, /api/budget-lines (CRUD) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read` / `budgets.create` / `budgets.update`) |
| /api/budgets/:budgetId/decision-history | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`budgets.read`) — historique décisionnel (RFC-032, lecture `AuditLog` filtrée) |
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
| /api/strategic-vision (GET) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.read`) |
| /api/strategic-vision/kpis | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.read`) |
| /api/strategic-vision/kpis/by-direction | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.read`) |
| /api/strategic-vision/alerts | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.read`) |
| /api/strategic-directions (GET) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.read`) |
| /api/strategic-directions (POST/PATCH/DELETE `:id`) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.update` **ou** `strategic_vision.manage_directions`) · DELETE → `204` sans corps si aucune stratégie de direction liée |
| /api/strategic-vision/objectives/:objectiveId/links (POST/PATCH/DELETE) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_vision.manage_links`) |
| /api/strategic-direction-strategies (GET) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.read`) |
| /api/strategic-direction-strategies (POST) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.create`) |
| /api/strategic-direction-strategies/:id/links (GET) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.read`) |
| /api/strategic-direction-strategies/:id/axes (PUT) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.update`) |
| /api/strategic-direction-strategies/:id/objectives (PUT) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.update`) |
| /api/strategic-direction-strategies/:id (GET) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.read`) |
| /api/strategic-direction-strategies/:id (PATCH) | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.update`) |
| /api/strategic-direction-strategies/:id/submit | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.update`) |
| /api/strategic-direction-strategies/:id/archive | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.update`) |
| /api/strategic-direction-strategies/:id/review | `Authorization: Bearer <accessToken>`, `X-Client-Id` | JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard (`strategic_direction_strategy.review`) |

---

## 5.0 ACL ressources — `/api/resource-acl` (RFC-ACL-005, RFC-ACL-014, **RFC-ACL-017**)

Administration des entrées **ResourceAcl** et de la **politique d’accès** par ressource, **dans le client actif uniquement** (`X-Client-Id`). Détail métier entrées : [RFC-ACL-005](RFC/RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md). Politique `DEFAULT` / `RESTRICTIVE` / `SHARING` : [RFC-ACL-017](RFC/RFC-ACL-017%20%E2%80%94%20Politique%20d%27acc%C3%A8s%20ressource.md).

- **Guards** :
  - **`GET`** : `JwtAuthGuard` → `ActiveClientGuard` → `ClientAdminGuard` (inchangé).
  - **`PATCH …/access-policy`** (RFC-ACL-017) : même stack que les mutations ACL ci-dessous (Option A RFC-ACL-014).
  - **`PUT` / `POST` … `/entries` / `DELETE` … `/entries/:entryId`** (RFC-ACL-014 Option A) : `JwtAuthGuard` → `ActiveClientOrPlatformContextGuard` → `ClientAdminOrPlatformAdminGuard` (CLIENT_ADMIN **ou** PLATFORM_ADMIN avec `X-Client-Id` valide même sans `ClientUser`).
- **Query `force`** : uniquement sur les mutations ci-dessus **et** sur `PATCH …/access-policy`. `force=true` **interdit** si l’utilisateur n’est pas `PLATFORM_ADMIN` → **403** + `reasonCode=RESOURCE_ACL_FORCE_FORBIDDEN` + audit `resource_acl.force_denied`. Si lockout « dernier ADMIN effectif » et bypass autorisé → audit `resource_acl.force_used`. Lockout sans `force` → **409** + `reasonCode=RESOURCE_ACL_LAST_ADMIN_LOCKOUT` + audit `resource_acl.lockout_blocked`.
- **Routes** :
  - `GET /api/resource-acl/:resourceType/:resourceId`
  - `PATCH /api/resource-acl/:resourceType/:resourceId/access-policy` — body `{ "mode": "DEFAULT" | "RESTRICTIVE" | "SHARING" }` ; réponse **liste ACL** (même forme que `GET`).
  - `PUT /api/resource-acl/:resourceType/:resourceId` (remplacement transactionnel des entrées)
  - `POST /api/resource-acl/:resourceType/:resourceId/entries`
  - `DELETE /api/resource-acl/:resourceType/:resourceId/entries/:entryId`
- **Réponse `GET` / corps `PUT` / `PATCH access-policy`** : en plus de `restricted` (inchangé : `entries.length > 0`) et `entries[]`, champs **`accessPolicy`** (mode Prisma résolu) et **`effectiveAccessMode`** (dérivé serveur pour l’UI — voir RFC-ACL-017 §2.c / §4).
- **Paramètres** : `resourceType` sur liste blanche V1 ; `resourceId` au format CUID. La validation est centralisée (**`resolveResourceAclRoute`**) avant toute lecture / écriture Prisma.
- **Corps JSON** : aucun champ `clientId` (rejet `forbidNonWhitelisted` si fourni) ; le client provient du contexte.
- **Audit** : mutations entrées ACL avec instantanés **old/new** exploitables (`resource_acl.*`) ; changement de politique → `resource_access_policy.changed`.
- **Garde métier** : `ResourceAclGuard` + `@RequireResourceAcl` (RFC-ACL-006) ; le module Nest du domaine importe **`AccessControlModule`** — il n’est pas fourni via **`CommonModule`**.
- **UI (RFC-ACL-013 + RFC-ACL-017)** : `apps/web/src/features/resource-acl/` — éditeur par ressource (sélecteur politique, bannières) dans les fiches métier ; le client actif reste porté par `X-Client-Id` comme pour toutes les routes métier.

## 5.05 Diagnostic droits effectifs — `/api/access-diagnostics` (RFC-ACL-011)

Vue consolidée “pourquoi accès autorisé/refusé” sur les couches `license`, `subscription`, `moduleActivation`, `moduleVisibility`, `RBAC`, `ACL`.

- **Endpoint client actif**
  - `GET /api/access-diagnostics/effective-rights?userId=...&resourceType=...&resourceId=...&operation=read|write|admin`
  - Guards: `JwtAuthGuard` → `ActiveClientGuard` → `ClientAdminGuard`
- **Endpoint plateforme**
  - `GET /api/platform/clients/:clientId/access-diagnostics/effective-rights?userId=...&resourceType=...&resourceId=...&operation=read|write|admin`
  - Guards: `JwtAuthGuard` → `PlatformAdminGuard`
- **Resource types V1 whitelistés**
  - `PROJECT`, `BUDGET`, `CONTRACT`, `SUPPLIER`, `STRATEGIC_OBJECTIVE`
  - hors whitelist => `reasonCode=RESOURCE_TYPE_UNSUPPORTED`
- **Contrat de check unifié**
  - `{ status: "pass" | "fail" | "not_applicable", reasonCode: string | null, message: string, details?: Record<string, unknown> }`
  - Avec **RFC-ACL-019** (flag actif) : champ optionnel **`evaluationMode`** sur chaque check des six couches — voir §5.05 ci-dessus.
- **Réponse consolidée**
  - `licenseCheck`, `subscriptionCheck`, `moduleActivationCheck`, `moduleVisibilityCheck`, `rbacCheck`, `aclCheck`
  - `finalDecision`, `denialReasons[]`, `computedAt`
- **RFC-ACL-019 — enrichissement opt-in** : si la variable d’environnement **`ACCESS_DIAGNOSTICS_ENRICHED`** vaut **`true`** ou **`1`** (normalisation stricte, toute autre valeur ou absence = désactivé), la réponse peut inclure en plus :
  - **`organizationScopeCheck`**, **`resourceOwnershipCheck`**, **`resourceAccessPolicyCheck`** : `{ status, reasonCode, message, enforcedForIntent }` (lecture **read** sur type supporté par le moteur et garde-fous OK → `enforcedForIntent: true` ; **write**/**admin** → blocs **pédagogiques** avec `enforcedForIntent: false` — pas de substitution du `finalDecision` legacy).
  - Sur chaque entrée des six couches historiques : champ optionnel **`evaluationMode`** ∈ `enforced` \| `informational` \| `superseded_by_decision_engine` lorsque la couche est harmonisée avec le verdict moteur **018** (évite un « échec » visuel contradictoire quand `finalDecision` **read** suit `decide`).
  - Sans flag actif : **aucun** de ces champs (le JSON reste strictement celui de la V1 **011**).
- **Anti-fuite**
  - aucune révélation d’existence user/ressource hors client ;
  - hors périmètre => refus générique stable (`DIAGNOSTIC_SCOPE_MISMATCH`) sans détail sensible.

### 5.051 Self-service — `GET /api/access-diagnostics/effective-rights/me` (RFC-ACL-014)

- **Guards** : `JwtAuthGuard` → `ActiveClientGuard` (membre client actif ; pas d’Option A plateforme).
- **Query** : `intent` obligatoire (`READ` \| `WRITE` \| `ADMIN`), `resourceType`, `resourceId` (CUID). Pas de `userId` en query (identité = JWT).
- **`finalDecision`** : `ALLOWED` \| `DENIED` \| `UNSAFE_CONTEXT` — ne pas tout regrouper en `UNSAFE_CONTEXT` : refus explicites (licence, module, RBAC, ACL) sur ressource **dans** le client ⇒ `DENIED` avec `reasonCode` par couche ; ressource absente / hors client / type non supporté ⇒ `UNSAFE_CONTEXT` + `reasonCode=DIAGNOSTIC_UNSAFE_CONTEXT`.
- **Réponse** : `resourceLabel` (null si contexte non sûr), `controls[]` canoniques (`USER_LICENSE`, `CLIENT_SUBSCRIPTION`, `CLIENT_MODULE_ENABLED`, `USER_MODULE_VISIBLE`, `RBAC_PERMISSION`, `RESOURCE_ACL`), `safeMessage`, `computedAt`.
- **RFC-ACL-019 (même flag `ACCESS_DIAGNOSTICS_ENRICHED`)** : contrôles supplémentaires **`ORGANIZATION_SCOPE`**, **`RESOURCE_OWNERSHIP`**, **`RESOURCE_ACCESS_POLICY`** (ordre entre RBAC et ACL) ; champs optionnels **`enforcedForIntent`** et **`evaluationMode`** sur les entrées de `controls[]` lorsque le mode enrichi harmonise l’affichage avec le moteur **018** ; sans flag, liste et forme inchangées (**014**).
- **Audit** : `access_diagnostic.self_outcome` pour `DENIED` et `UNSAFE_CONTEXT` (pas pour `ALLOWED` nominal).

### 5.052 `GET /api/me/permissions` — `roles[]` informatif (RFC-ACL-014)

- Réponse enrichie avec `roles[]` (`id`, `name`, `code` nullable, `scope`, `clientId`) — **informatif uniquement** ; l’UI ne dérive pas les droits depuis `roles[]`.
- `permissionCodes` : codes **bruts** issus des rôles (filtre modules activés) — alignés sur `satisfiesPermission` côté API ; utiliser le hook `has(code)` côté web pour refléter les guards.
- `uiPermissionHints` (RFC-ACL-015) : implications d’affichage (ex. `read_scope` / `read_own` dérivés de `read_all`) — **ne pas** utiliser seuls pour afficher une action que le backend refuserait.
- **Implémentation** : règles `satisfiesPermission` / hints dans le package workspace **`@starium-orchestra/rbac-permissions`** ; voir [RFC-ACL-015](RFC/RFC-ACL-015%20%E2%80%94%20Permissions%20OWN%20SCOPE%20ALL.md).

## 5.06 License Reporting — `/api/platform/license-reporting` (RFC-ACL-012)

KPI commerciaux, trajectoire mensuelle dérivée des dates de licence/abonnement et exports CSV/JSON.

- **Périmètre** : plateforme uniquement (multi-client).
- **Guards (tous endpoints)** : `JwtAuthGuard` → `PlatformAdminGuard`.
- **Pas de migration Prisma** : agrégats calculés à la volée à partir de `ClientUser` et `ClientSubscription` (V1). Pas de table `LicenseUsageDailySnapshot`.
- **Filtres communs (query string)**
  - `clientId?` (CUID validé) — restreint à un client. `clientId` inexistant => `400` stable (anti-fuite).
  - `licenseBillingMode?` (`CLIENT_BILLABLE` / `EXTERNAL_BILLABLE` / `NON_BILLABLE` / `PLATFORM_INTERNAL` / `EVALUATION`).
  - `subscriptionStatus?` (`DRAFT` / `ACTIVE` / `SUSPENDED` / `CANCELED` / `EXPIRED`).
- **Endpoints**
  - `GET /api/platform/license-reporting/overview` → snapshot global agrégé (totaux, sièges READ_WRITE billables, distribution licences, distribution abonnements).
  - `GET /api/platform/license-reporting/clients` → ligne par client (`clientName`, `clientSlug`, totaux, sièges, distributions). Toujours libellé métier, jamais d’ID brut.
  - `GET /api/platform/license-reporting/monthly?from=YYYY-MM&to=YYYY-MM` → série mensuelle. Par défaut : 12 derniers mois UTC. Fenêtre max **24 mois** (`400` au-delà), `from > to` rejeté.
  - `GET /api/platform/license-reporting/clients.csv` et `GET /api/platform/license-reporting/monthly.csv` → exports CSV via `StreamableFile` (RFC 4180, BOM UTF-8, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`).
- **Dictionnaire KPI canonique (V1)** — utilisé identiquement côté API et UI :
  - `licenses.readOnly`, `clientBillable`, `externalBillable`, `nonBillable`, `evaluationActive`, `evaluationExpired`, `platformInternal`, `platformInternalActive`, `platformInternalExpired`.
  - `subscriptions.draft|active|suspended|canceled|expired|expiredInGrace`.
  - `seats.readWriteBillableUsed` (consommation), `seats.readWriteBillableLimit` (capacité).
- **Sémantique période mensuelle** : une licence ou un abonnement est compté pour le mois `M` si `start = licenseStartsAt ?? createdAt ≤ fin(M)` et (`end = licenseEndsAt` est `null` ou `≥ début(M)`). Bucket `evaluationActive`/`platformInternalActive` vs leurs variantes `Expired` selon comparaison `licenseEndsAt < fin(M)`.
- **Sémantique grâce abonnement** : `EXPIRED` + `graceEndsAt ≥ now` → comptabilisé en `expired` ET `expiredInGrace`.

## 5.1 RBAC métier — décorateur et conventions

Les endpoints “métier” (scopés client) utilisent :

- `@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)`
- `@RequirePermissions('<module>.<action>', ...)`

Règles :

- **Stratégie AND** : toutes les permissions listées sont requises.
- **Un seul module par route** : ne jamais mélanger `budgets.*` et `contracts.*` sur le même handler.\n  - Raison : `ModuleAccessGuard` déduit le module depuis la 1ère permission et doit rester non ambigu.
- **`CLIENT_ADMIN` n’implique pas “toutes les permissions métier”** : l’administration du client passe par `ClientAdminGuard`, les permissions métier restent RBAC.

## 5.2 Strategic Vision listing — `/api/strategic-vision`

- **Méthode/route** : `GET /api/strategic-vision`
- **Headers requis** :
  - `Authorization: Bearer <accessToken>`
  - `X-Client-Id: <clientId>`
- **Guards (ordre)** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **Permission requise** : `strategic_vision.read`
- **Query optionnelle** :
  - `status=<DRAFT|ACTIVE|ARCHIVED>`
  - `search=<texte>`
  - `includeArchived=true|false` (par défaut, les visions `ARCHIVED` sont exclues sauf filtre explicite)

## 5.3 Strategic Vision KPI — `/api/strategic-vision/kpis`

Endpoint RFC-STRAT-002 (moteur KPI stratégique MVP).

- **Méthode/route** : `GET /api/strategic-vision/kpis`
- **Headers requis** :
  - `Authorization: Bearer <accessToken>`
  - `X-Client-Id: <clientId>`
- **Guards (ordre)** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **Permission requise** : `strategic_vision.read`

**Contrat de réponse (200)** :

```ts
{
  projectAlignmentRate: number; // ratio borné 0..1
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  generatedAt: string; // ISO datetime
}
```

## 5.4 Strategic Vision Alerts — `/api/strategic-vision/alerts`

Endpoint RFC-STRAT-008 (alertes stratégiques V1, scoping client strict).

- **Méthode/route** : `GET /api/strategic-vision/alerts`
- **Headers requis** :
  - `Authorization: Bearer <accessToken>`
  - `X-Client-Id: <clientId>`
- **Guards (ordre)** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **Permission requise** : `strategic_vision.read`
- **Query optionnelle** :
  - `directionId=<strategicDirectionId>` : alerte(s) liées à une direction précise
  - `unassigned=true` : alerte(s) liées à des objectifs sans direction
  - `directionId` et `unassigned=true` sont mutuellement exclusifs
- **Périmètre V1** :
  - backend-only (pas de branchement sur le socle transverse `Alert`/`Notification`)
  - pas d’extension frontend dans cette RFC
- **Projets actifs (PROJECT_UNALIGNED)** :
  - source unique : `activePortfolioProjectsWhere(clientId)`
  - exclus a minima : `ARCHIVED`, `CANCELLED`, `COMPLETED`
- **Règles V1 complémentaires** :
  - `PROJECT_UNALIGNED` est toujours renvoyée avec `severity = MEDIUM` (pas de sévérité dynamique en V1)
  - IDs déterministes (pas de `uuid`, `cuid`, `Date.now()`)
    - `strategic-objective-overdue:<objectiveId>`
    - `strategic-objective-off-track:<objectiveId>`
    - `strategic-project-unaligned:<projectId>`
  - tri stable : `severity` (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`), puis `createdAt` décroissant, puis `targetLabel` alphabétique
  - `createdAt` est dérivé de la ressource :
    - `OBJECTIVE_OVERDUE` : `targetDate`, sinon `updatedAt`, sinon `createdAt`
    - `OBJECTIVE_OFF_TRACK` : `updatedAt`, sinon `createdAt`
    - `PROJECT_UNALIGNED` : `updatedAt` projet, sinon `createdAt` projet
  - `targetLabel` est un libellé métier lisible (jamais UUID seul)
    - objectif : `title`/`name`
    - projet : `code + name` quand disponibles

**Contrat de réponse (200)** :

```ts
{
  items: Array<{
    id: string;
    type: "OBJECTIVE_OVERDUE" | "OBJECTIVE_OFF_TRACK" | "PROJECT_UNALIGNED";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    targetType: "OBJECTIVE" | "PROJECT";
    directionId: string | null;
    directionName: string; // ex: "DSI", "Non affecté"
    targetLabel: string;
    message: string;
    createdAt: string; // ISO datetime
  }>;
  total: number;
}
```

## 5.5 Strategic Vision KPI by direction — `/api/strategic-vision/kpis/by-direction`

Endpoint RFC-STRAT-005 (lecture cockpit par direction, sans changer le KPI global STRAT-002).

- **Méthode/route** : `GET /api/strategic-vision/kpis/by-direction`
- **Headers requis** :
  - `Authorization: Bearer <accessToken>`
  - `X-Client-Id: <clientId>`
- **Guards (ordre)** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
- **Permission requise** : `strategic_vision.read`

**Contrat de réponse (200)** :

```ts
{
  rows: Array<{
    directionId: string | null;
    directionCode: string;
    directionName: string;
    projectAlignmentRate: number;
    unalignedProjectsCount: number;
    objectivesAtRiskCount: number;
    objectivesOffTrackCount: number;
    overdueObjectivesCount: number;
    alignedActiveProjectsCount: number;
    totalActiveProjectsRelevantCount: number;
  }>;
  global: {
    projectAlignmentRate: number;
    unalignedProjectsCount: number;
    objectivesAtRiskCount: number;
    objectivesOffTrackCount: number;
    overdueObjectivesCount: number;
    generatedAt: string;
  };
  generatedAt: string;
}
```

## 5.6 Strategic directions — `/api/strategic-directions`

Référentiel direction métier client-scopé (RFC-STRAT-005), orthogonal aux axes stratégiques.

- **GET /api/strategic-directions** :
  - Permission : `strategic_vision.read`
  - Query optionnelle : `isActive=true|false`, `search=<code|name>`
- **POST /api/strategic-directions** :
  - Permission : `strategic_vision.update` **ou** `strategic_vision.manage_directions`
- **PATCH /api/strategic-directions/:id** :
  - Permission : `strategic_vision.update` **ou** `strategic_vision.manage_directions`
- **DELETE /api/strategic-directions/:id** :
  - Permission : `strategic_vision.update` **ou** `strategic_vision.manage_directions`
  - Réponse : `204 No Content`
  - Refus (`400`) tant qu’il existe au moins une stratégie de direction **non archivée** (`status` ≠ `ARCHIVED`) pour cette direction.

**Champs principaux** : `id`, `clientId`, `code`, `name`, `description`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`.

## 5.7 Strategic direction strategy workflow — `/api/strategic-direction-strategies`

Workflow RFC-STRAT-006 (phase 2) client-scopé, sans duplication d’axes/objectifs.

- **Alignement cockpit** — une stratégie porte déjà une `alignedVisionId` obligatoire. Les liaisons **`StrategicDirectionStrategyAxisLink`** et **`StrategicDirectionStrategyObjectiveLink`** matérialisent un sous-ensemble d’axes / objectifs de cette vision utilisé pour le pilotage CODIR :

  - **`PUT …/axes`** : body `{ strategicAxisIds: string[] }` (`[]` autorise tout retirer) ; tous les axes doivent appartenir à la vision alignée ; si tous les axes sont retirés, **toutes** les liaisons objectifs sont supprimées.
  - **`PUT …/objectives`** : body `{ strategicObjectiveIds: string[] }` ; chaque objectif doit être sous un axe dont la vision est la vision alignée ; **si au moins un axe est encore lié à la stratégie**, l’objectif doit être sous l’un de ces axes ; sinon, tout objectif de la vision est éligible.
  - Réponses métier lisibles dans **`GET …/links`** (noms d’axes, titres et statuts d’objectifs, axe parent pour chaque objectif).

- **GET /api/strategic-direction-strategies**
  - Permission : `strategic_direction_strategy.read`
  - Query optionnelle : `directionId=<strategicDirectionId>`, `alignedVisionId=<visionId>`, `status=<DRAFT|SUBMITTED|APPROVED|REJECTED|ARCHIVED>`, `search=<titre|ambition|direction>`, `includeArchived=true` (liste par défaut : **sans** les entrées `ARCHIVED`, sauf filtre explicite `status=ARCHIVED` qui les inclut).
- **POST /api/strategic-direction-strategies**
  - Permission : `strategic_direction_strategy.create`
  - Crée un brouillon (`DRAFT`) ; `directionId` est porté par le body, `clientId` vient du contexte actif.
  - Champs V1 : `directionId`, `alignedVisionId`, `title`, `ambition`, `context`, `horizonLabel`, `ownerLabel?`, `statement?`, `strategicPriorities?`, `expectedOutcomes?`, `kpis?`, `majorInitiatives?`, `risks?`.
  - Retourne `409 Conflict` s’il existe déjà une stratégie **active** `(clientId, directionId, alignedVisionId)` (statut différent de `ARCHIVED`).
- **GET /api/strategic-direction-strategies/:id/links**
  - Permission : `strategic_direction_strategy.read`
  - Réponse 200 exemple :

```json
{
  "axes": [{ "id": "…", "name": "Souveraineté & sécurité", "orderIndex": 1 }],
  "objectives": [
    {
      "id": "…",
      "title": "Renforcer IAM",
      "status": "ON_TRACK",
      "axis": { "id": "…", "name": "Souveraineté & sécurité" }
    }
  ]
}
```

- **PUT /api/strategic-direction-strategies/:id/axes**
  - Permission : `strategic_direction_strategy.update`
  - Même fenêtre éditable que le `PATCH` principal (`DRAFT`/`REJECTED`/`APPROVED`, jamais `SUBMITTED`/`ARCHIVED`).
  - Body : `{ "strategicAxisIds": ["…"] }`
  - `400` si un axe est inconnu, hors client, ou hors vision alignée. Réponse 200 : payload identique à `GET …/links`.
- **PUT /api/strategic-direction-strategies/:id/objectives**
  - Permission : `strategic_direction_strategy.update`
  - Body : `{ "strategicObjectiveIds": ["…"] }` ; règle de périmètre axes décrite ci-dessus. Réponse 200 : `GET …/links`.
- **GET /api/strategic-direction-strategies/:id**
  - Permission : `strategic_direction_strategy.read`
- **PATCH /api/strategic-direction-strategies/:id**
  - Permission : `strategic_direction_strategy.update`
  - Autorisé en `DRAFT`, `REJECTED` et `APPROVED` (interdit en `SUBMITTED` et `ARCHIVED`).
  - Règle d’adaptation d’une stratégie `APPROVED` : le body doit inclure `archiveReason` (motif obligatoire). Le backend archive automatiquement un **snapshot** de la version approuvée précédente (`status=ARCHIVED`, `archivedReason`, `archivedAt`, liens axes/objectifs clonés), puis met à jour l’enregistrement courant en `DRAFT` avec reset des champs de review (`submitted*`, `approved*`, `rejectionReason`).
  - Champs modifiables V1 : `alignedVisionId`, `title`, `ambition`, `context`, `horizonLabel`, `ownerLabel`, `statement`, `strategicPriorities`, `expectedOutcomes`, `kpis`, `majorInitiatives`, `risks`, `archiveReason?` (requis seulement si statut courant = `APPROVED`).
- **POST /api/strategic-direction-strategies/:id/submit**
  - Permission : `strategic_direction_strategy.update`
  - Autorisé depuis `DRAFT` ou `REJECTED` uniquement.
  - Requiert `alignedVisionId` du même client et les champs `title`, `ambition`, `context` renseignés.
- **POST /api/strategic-direction-strategies/:id/archive**
  - Permission : `strategic_direction_strategy.update`
  - Passe une stratégie **`APPROVED`** en **`ARCHIVED`** (horodatage `archivedAt`) ; lecture seule ensuite. Permet d’ouvrir un **nouveau** cycle pour la même tripletta `(client, direction, vision)` grâce à l’unicité partielle en base (une seule stratégie non archivée par tripletta).
- **POST /api/strategic-direction-strategies/:id/review**
  - Permission : `strategic_direction_strategy.review`
  - Body :

```ts
{
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string; // requis si REJECTED
}
```

Statuts : `DRAFT` -> `SUBMITTED` -> `APPROVED | REJECTED` ; depuis `APPROVED`, deux options :
- `POST …/archive` pour archiver explicitement la version approuvée ;
- `PATCH …/:id` avec `archiveReason` pour **adapter** la stratégie courante (snapshot `ARCHIVED` auto + stratégie courante repassée en `DRAFT`).
Le `PATCH` reste interdit en `SUBMITTED` et `ARCHIVED`.
`statement` reste conservé en legacy (compat API), tandis que l’UI V1 pilote les contenus via `title`, `ambition`, `context`.

## 5.7 Socle alertes et notifications (RFC-038) — `/api/alerts`, `/api/notifications`

Socle transverse **distinct** de `GET /api/strategic-vision/alerts` (§5.3). Toutes les routes ci-dessous exigent **`Authorization`** + **`X-Client-Id`**, avec guards `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.

### GET /api/alerts

- **Permission** : `alerts.read`
- **Query** : `limit`, `offset` (pagination), optionnellement `status`, `severity`, `type`, `entityType` (valeurs enum Prisma / JSON : `ACTIVE`, `CRITICAL`, etc.).
- **Réponse 200** : `{ items, total, limit, offset }` — chaque item est une `Alert` scopée `clientId` actif.

### PATCH /api/alerts/:id/resolve

- **Permission** : `alerts.update`

### PATCH /api/alerts/:id/dismiss

- **Permission** : `alerts.update`

### GET /api/notifications

- **Permission** : `notifications.read`
- **Query** : `limit`, `offset`, optionnellement `status` (`UNREAD` | `READ`).
- **Réponse 200** : `{ items, total, unread, limit, offset }` — **uniquement** les notifications du **user JWT courant** pour le `clientId` actif ; `unread` sert au badge cloche.

### PATCH /api/notifications/:id/read

- **Permission** : `notifications.update`  
- Effet : ligne appartenant à `(clientId, userId)` uniquement.

### PATCH /api/notifications/read-all

- **Permission** : `notifications.update`  
- Effet : toutes les notifications **UNREAD** du **user courant** + **client actif** uniquement.

**Modules RBAC** : codes plateforme `alerts` et `notifications` (activation client via `ClientModule`, comme les autres modules). **Worker email** : traitement asynchrone des jobs `send_email` — process séparé, voir [RFC-038](RFC/RFC-038%20%E2%80%94%20Socle%20alertes%20et%20emails%20async.md) et [ARCHITECTURE.md](../ARCHITECTURE.md) §7.

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
| `action`     | string | Code d’action `<resource>.<action>` (ex. `user.created`) ; **mutuellement exclusif** avec `actionPrefix` |
| `actionPrefix` | string | Préfixe d’action (ex. `organization.`) — filtre `startsWith` ; **400** si fourni en même temps que `action` (`Use either action or actionPrefix, not both.`) |
| `userId`     | string | Filtre sur l’utilisateur initiateur                  |
| `resourceId` | string | Filtre sur l’identifiant métier ciblé par le log       |
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

**Erreurs :** 401, 403 (client invalide, module `audit_logs` désactivé, permission manquante). **400** si `action` et `actionPrefix` sont tous deux renseignés.

### Organisation client — `/api/organization/*` (RFC-ORG-001)

Préfixe **`/api/organization`** : même chaîne de guards que le métier client (`JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`). Module catalogue **`organization`** ; permissions **`organization.read`**, **`organization.update`**, **`organization.members.update`**.

Principales routes :

- `GET /api/organization/units` — arbre des unités (`organization.read`).
- `POST /api/organization/units`, `PATCH /api/organization/units/:id`, `POST /api/organization/units/:id/archive` — `organization.update`.
- `GET|POST /api/organization/units/:id/members`, `DELETE /api/organization/units/:id/members/:membershipId` — lecture membres : `organization.read` ; mutations : `organization.members.update` (rattachements sur **`Resource` HUMAN** du client actif ; DELETE renvoie **404** si le membership ne correspond pas à l’unité ou au client).
- Même schéma sous **`/api/organization/groups`** pour les groupes métier.

Les actions d’audit associées sont préfixées **`organization.`** ; l’UI administration peut les lister via `GET /api/audit-logs?actionPrefix=organization.` (permission **`audit_logs.read`**).

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

#### RFC-ACL-008 — licences, abonnements, refus d’écriture

- **Licences** : filtre stable recommandé `resourceType=client_user_license` et `resourceId=<clientUserId>` (PK `ClientUser`, exploitable sans filtre JSON sur le payload).
- **Abonnements** : `resourceType=client_subscription`, `resourceId=<subscriptionId>`, actions `client_subscription.*`.
- **Compatibilité lecture** : une requête avec d’anciennes actions courtes (`evaluation_granted`, etc.) est élargie vers les codes canoniques `client_user.license.*`.
- **Refus d’écriture** (`client_user.license.write_denied`) : `newValue` minimal (`reasonCode`, `actorUserId`, `requestId`), sans données sensibles.

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
- **BudgetStatus** : `DRAFT`, `SUBMITTED`, `REVISED`, `VALIDATED`, `LOCKED`, `ARCHIVED` (cycle de vie : brouillon → soumis → révisé → validé → verrouillé → archivé ; l’ancien `ACTIVE` est migré en `VALIDATED`)
- **BudgetEnvelopeType** : `RUN`, `BUILD`, `TRANSVERSE`
- **BudgetEnvelopeStatus** : `DRAFT`, `PENDING_VALIDATION`, `ACTIVE`, `REJECTED`, `DEFERRED`, `LOCKED`, `ARCHIVED`
- **BudgetLineStatus** : `DRAFT`, `PENDING_VALIDATION`, `ACTIVE`, `REJECTED`, `DEFERRED`, `CLOSED`, `ARCHIVED`
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

### PATCH /api/budget-exercises/bulk-status

Mise à jour du **statut** sur plusieurs exercices en une requête. **Body** : `ids` (tableau **1 à 100** d’identifiants, doublons ignorés), `status` (`BudgetExerciseStatus`). **Permission** : `budgets.update`. Pour chaque id, réutilise les mêmes règles que `PATCH /api/budget-exercises/:id` (échecs isolés, les autres id sont tout de même traités). **Réponse 200** : `{ status, updatedIds, failed: [{ id, error }] }`.

---

### GET /api/budgets

Liste les budgets. **Query** : `exerciseId`, `status`, `ownerUserId`, `search`, `offset`, `limit`. **Tri** : `createdAt desc`.

---

### POST /api/budgets

Crée un budget. **Body** : `exerciseId`, `name`, `code?`, `description?`, `currency`, `status?`, `ownerUserId?`. L’exercice doit appartenir au client ; si `ownerUserId` fourni, l’utilisateur doit être rattaché au client actif. Si `code` absent, généré (`BUD-suffix`).

---

### GET /api/budgets/:id — PATCH /api/budgets/:id

Détail et mise à jour. PATCH refusé si status = LOCKED ou ARCHIVED. **Changement de `status`** : matrice **Transitions autorisées (budget)** (identique à `PATCH /api/budgets/bulk-status`, `400` avec `invalid_status_transition` si interdit). **Passage à `VALIDATED`** : refusé tant qu’**au moins une enveloppe** du budget est encore en **`DRAFT`** (`400` avec message métier dédié), sauf si le client a désactivé la garde via `GET|PATCH /api/clients/active/budget-workflow-settings`.

**Versions figées automatiques (workflow)** : après une mise à jour réussie qui fait passer le budget à **`SUBMITTED`** ou **`VALIDATED`**, le serveur tente de créer une **version figée** (`BudgetSnapshot`) via le même pipeline que `POST /api/budget-snapshots` (nom du type `Soumission — {code}` / `Validation — {code}`, type d’occasion global `WORKFLOW_SUBMITTED` / `WORKFLOW_VALIDATED` si présent en base — seed / migration `20260408140000_workflow_snapshot_occasion_types`). En cas d’échec, le **statut budget reste appliqué** ; une entrée d’audit **`budget.workflow_snapshot.failed`** est enregistrée (voir RFC-032, onglet Décisions si l’action est affichée).

---

### PATCH /api/budgets/bulk-status

Mise à jour du **statut** sur plusieurs budgets. **Body** : `ids` (1 à 100), `status` (`BudgetStatus`). **Permission** : `budgets.update`. Même logique métier que `PATCH /api/budgets/:id` par id. **Réponse 200** : `{ status, updatedIds, failed: [{ id, error }] }`.

**Transitions autorisées (budget)** — matrice serveur (`invalid_status_transition` sinon) : `DRAFT → SUBMITTED|ARCHIVED`, `SUBMITTED → REVISED|VALIDATED|DRAFT`, `REVISED → VALIDATED|SUBMITTED|DRAFT`, `VALIDATED → LOCKED|REVISED|SUBMITTED|ARCHIVED`, `LOCKED → ARCHIVED` ; même statut = accepté (no-op).

---

### GET /api/budget-envelopes

Liste les enveloppes. **Query** : `budgetId`, `search`, `offset`, `limit`. **Tri** : `createdAt desc`.

---

### POST /api/budget-envelopes

Crée une enveloppe. **Body** : `budgetId`, `name`, `code?`, `description?`, `type` (obligatoire), `parentId?`, `sortOrder?`. Le budget ne doit pas être LOCKED/ARCHIVED. Si `parentId` fourni, l’enveloppe parent doit exister et appartenir au même budget/client. Si `code` absent, généré (`ENV-suffix`).

---

### GET /api/budget-envelopes/:id — PATCH /api/budget-envelopes/:id

Détail et mise à jour (dont `status` : `BudgetEnvelopeStatus`, `deferredToExerciseId?` : cible de report si `status` = `DEFERRED`, sinon `null`). Les transitions de statut sont validées côté serveur (matrice figée ; erreur `400` avec code `invalid_status_transition` si interdit). PATCH refusé si le **budget parent** est LOCKED ou ARCHIVED (ou version superseded/archived).

---

### PATCH /api/budget-envelopes/bulk-status

Mise à jour du **statut** sur plusieurs enveloppes. **Body** : `ids` (1 à 100), `status` (`BudgetEnvelopeStatus`), `deferredToExerciseId?` (obligatoire et non vide si `status` = `DEFERRED` ; absent ou `null` si autre statut). **Permission** : `budgets.update`. Même logique que `PATCH /api/budget-envelopes/:id` par id (pas de rollback global : les ids déjà traités restent appliqués). **Réponse 200** : `{ status, updatedIds, failed: [{ id, error }] }`.

**Transitions autorisées (enveloppe) — résumé** : `DRAFT → PENDING_VALIDATION|ARCHIVED`, `PENDING_VALIDATION → ACTIVE|REJECTED|DEFERRED`, `REJECTED → DRAFT`, `DEFERRED → DRAFT|ACTIVE`, `ACTIVE → PENDING_VALIDATION|LOCKED|DEFERRED`, `LOCKED → ARCHIVED` ; sinon `400 invalid_status_transition`.

---

### GET /api/budget-lines

Liste les lignes budgétaires. **Query** : `budgetId`, `envelopeId`, `status`, `expenseType`, `costCenterId` (lignes ayant un split vers ce centre), `generalLedgerAccountId`, `allocationScope` (ENTERPRISE | ANALYTICAL), `search`, `offset`, `limit`. **Tri** : `createdAt desc`. Les montants et champs analytiques (generalLedgerAccount, analyticalLedgerAccount, costCenterSplits) sont inclus. Les montants retournés sont des **number**.

---

### POST /api/budget-lines

Crée une ligne. **Body** : `budgetId`, `envelopeId`, `name`, `code?`, `description?`, `expenseType`, **`generalLedgerAccountId`** (obligatoire), `analyticalLedgerAccountId?`, `allocationScope?` (défaut ENTERPRISE), `costCenterSplits?` (tableau `[{ costCenterId, percentage }]` si ANALYTICAL ; somme = 100), `initialAmount`, `revisedAmount?`, `currency`, `status?`. L’enveloppe et le compte comptable doivent appartenir au client. **Règles** : ENTERPRISE ⇒ 0 split ; ANALYTICAL ⇒ au moins 1 split, somme 100 %, unicité costCenter par ligne. Si `code` absent, généré (`BL-suffix`).

---

### GET /api/budget-lines/:id — PATCH /api/budget-lines/:id

Détail et mise à jour d’une ligne. Réponse inclut `generalLedgerAccount`, `analyticalLedgerAccount`, `costCenterSplits`, `deferredToExerciseId` / libellés cible (`deferredToExerciseName`, `deferredToExerciseCode`) lorsque présents. PATCH : champs optionnels dont `status`, `deferredToExerciseId` (mêmes règles que l’enveloppe pour `DEFERRED`), `generalLedgerAccountId`, `analyticalLedgerAccountId`, `allocationScope`, `costCenterSplits`. Si `allocationScope` = ENTERPRISE, les splits existants sont supprimés ; si ANALYTICAL et `costCenterSplits` non fourni, les splits existants sont conservés. Si `revisedAmount` change, `remainingAmount` est recalculé. PATCH refusé si budget parent LOCKED/ARCHIVED ou si ligne ARCHIVED/CLOSED (sauf transition autorisée vers ARCHIVED).

**Note** : les routes `GET /api/budget-lines/:id/allocations` et `GET /api/budget-lines/:id/events` sont documentées en §16 (noyau financier).

**Planning prévisionnel ([RFC-023 — Budget Prévisionnel](RFC/RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md))** — sous `/api/budget-lines/:id/planning` : `GET` (query optionnelle `referenceDate`), `PUT` (saisie manuelle des 12 mois), `POST .../planning/apply-mode` (corps discriminant par `mode`), routes `POST .../planning/apply-*` (**legacy**, mêmes comportements), `POST .../planning/calculate`, `POST .../planning/apply-calculation`. **Permissions** : `budgets.read` / `budgets.update`. Réponse : montants d’atterrissage et écarts calculés côté serveur ; champs canoniques `planningDelta`, `landingVariance` (alias de transition documentés dans [CHANGELOG.md](../CHANGELOG.md)).

---

### PATCH /api/budget-lines/bulk-status

Mise à jour du **statut** sur plusieurs lignes. **Body** : `ids` (1 à 100), `status` (`BudgetLineStatus`), `deferredToExerciseId?` (obligatoire si `status` = `DEFERRED`, interdit sinon). **Permission** : `budgets.update`. Même logique que `PATCH /api/budget-lines/:id` par id. **Réponse 200** : `{ status, updatedIds, failed: [{ id, error }] }`.

**Transitions autorisées (ligne) — résumé** : `DRAFT → PENDING_VALIDATION|ARCHIVED`, `PENDING_VALIDATION → ACTIVE|REJECTED|DEFERRED`, `REJECTED → DRAFT`, `DEFERRED → DRAFT|ACTIVE`, `ACTIVE → PENDING_VALIDATION|CLOSED|DEFERRED`, `CLOSED → ARCHIVED` ; sinon `400 invalid_status_transition`.

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
- Si `exerciseId` fourni : charger l’exercice ; budget = budget versionné actif (`BudgetVersionSet.activeBudgetId`) si présent, sinon premier budget de l’exercice **non** LOCKED/ARCHIVED (tri `updatedAt` desc), sinon budget le plus récent de l’exercice ; 404 si aucun budget.
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

## 20 bis. Versions figées (snapshots, RFC-033) — `/api/budget-snapshots`, `/api/budget-snapshot-occasion-types`, `/api/platform/budget-snapshot-occasion-types`

**Sémantique produit** : une **version figée** est une copie **lecture seule** du budget à une date donnée (audit, CODIR, comparaison). Ne pas confondre avec les **révisions** RFC-019 (`/api/budgets/:id/create-revision`).

**Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard` (sauf routes `/api/platform/...` : `PlatformAdminGuard`).

### `/api/budget-snapshots`

- **POST** — Body : `budgetId`, `name` ou `label`, `description?`, `snapshotDate?` (ISO 8601), `occasionTypeId?`. Copie **toutes les lignes de budget non archivées** ; pour chaque ligne, les montants **prévision / engagé / consommé / restant** sont **recalculés** à partir des **mouvements connus jusqu’à la fin du jour calendaire UTC** de `snapshotDate` : `FinancialEvent` avec `eventDate <=` ce point (ex. facture : `eventDate` = date facture, même si saisie ultérieure), `FinancialAllocation` avec `effectiveDate <=` ce point ou, si `effectiveDate` est nul, `createdAt <=` ce point. Le **montant initial** de ligne copié est celui **actuel** sur `BudgetLine` (pas d’historique de révision de ligne dans ce flux). Permission **`budgets.create`**. Réponse et audit `budget_snapshot.created` — même mécanisme que les captures **automatiques** déclenchées par passage du budget à **Soumis** / **Validé** (voir **PATCH /api/budgets/:id** ci-dessus) ; celles-ci n’exposent pas de route HTTP dédiée.
- **GET** — Query : `budgetId?`, `limit`, `offset`. Permission **`budgets.read`**.
- **GET /:id** — Détail + lignes figées. Permission **`budgets.read`**.
- **GET /compare** — Query : `leftSnapshotId`, `rightSnapshotId`. Permission **`budgets.read`**.

**Types d’occasion globaux (exemples)** : en plus du catalogue métier (CODIR, clôture, etc.), le dépôt prévoit **`WORKFLOW_SUBMITTED`** et **`WORKFLOW_VALIDATED`** pour étiqueter les versions figées créées au passage des statuts **SUBMITTED** et **VALIDATED** (idempotent à l’insertion par seed / migration).

### `/api/budget-snapshot-occasion-types` (client actif)

- **GET** — Liste fusionnée types globaux + types du client (`scope`, `code`, `label`). Permission **`budgets.read`**.
- **POST | PATCH /:id** — Types **client** uniquement. Permission **`budgets.snapshot_occasion_types.manage`**.
- **DELETE /:id** — Désactivation logique (`isActive: false`). Même permission.

### `/api/platform/budget-snapshot-occasion-types`

- **GET | POST | PATCH /:id | DELETE /:id** — CRUD types **globaux** (`clientId` null). **`PLATFORM_ADMIN`** uniquement.

**Comparaison budgétaire (lien RFC-030 / RFC-FE-BUD-030)** : `GET /api/budget-comparisons/budgets/:budgetId?compareTo=baseline|snapshot|version&targetId=…` ; `GET /api/budget-comparisons/snapshots`, `GET /api/budget-comparisons/versions`. L’UI Next.js (onglet Comparaison) utilise **baseline** et **version figée** (`snapshot`) pour « Actuel vs référence », plus des onglets **deux / plusieurs versions figées** ; le mode **`compareTo=version`** (révisions RFC-019) reste exposé par l’API pour d’autres clients.

---

## 21. Module Projets (RFC-PROJ-001 MVP) — `/api/projects`, `/api/projects/:projectId/tasks|task-buckets|gantt|activities|risks|milestones|budget-links|scenarios|.../financial-lines|.../financial-summary|project-sheet|reviews|documents`, `/api/projects/:projectId/microsoft-link`

Référence : **RFC-PROJ-001**, **RFC-PROJ-010** (liens budget), **RFC-PROJ-011** (tâches enrichies, jalons, activités, payload **`GET /gantt`**), **RFC-PROJ-012** — *deux livrables distincts dans le dépôt* : [fiche décisionnelle Project Sheet](RFC/RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) et [UI Gantt Tâches et Jalons](RFC/RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md), **RFC-PROJ-013** (points projet COPIL/COPRO), **RFC-PROJ-DOC-001** (registre `ProjectDocument`), **RFC-PROJ-SC-001** / **RFC-PROJ-SC-002** (scénarios + projections financières scénario), détail : [docs/modules/projects-mvp.md](modules/projects-mvp.md).

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

### Scénarios projet (RFC-PROJ-SC-001 / RFC-PROJ-SC-002) — `/api/projects/:projectId/scenarios`

Socle backend de simulation / baseline projet. Isolation stricte par **client actif** et par **`projectId`** ; un `scenarioId` seul ne suffit jamais. `budgetSummary`, `resourceSummary`, `timelineSummary`, `capacitySummary` et `riskSummary` restent **`null` sur la liste** des scénarios ; sur le **détail** (`GET /api/projects/:projectId/scenarios/:scenarioId`), `budgetSummary`, `resourceSummary`, `timelineSummary`, `capacitySummary` et `riskSummary` sont alimentés par leurs services dédiés.

- **GET /api/projects/:projectId/scenarios** — Liste paginée `{ items, total, limit, offset }`. Query supportée : `search`, `status`, `limit`, `offset`. **`projects.read`**
- **POST /api/projects/:projectId/scenarios** — Création (`name` requis, `code` optionnel, `description`, `assumptionSummary`). Le scénario est créé en `DRAFT`, avec `isBaseline = false`. **`projects.update`**
- **GET /api/projects/:projectId/scenarios/:scenarioId** — Détail / résumé d’un scénario ; inclut `budgetSummary`, `resourceSummary`, `timelineSummary`, `capacitySummary` (SC-005) et `riskSummary` (SC-006). **`projects.read`**
- **PATCH /api/projects/:projectId/scenarios/:scenarioId** — Mise à jour des métadonnées (`name`, `code`, `description`, `assumptionSummary`) ; refus si le scénario est `ARCHIVED`. **`projects.update`**
- **POST /api/projects/:projectId/scenarios/:scenarioId/duplicate** — Duplication **légère** du scénario (pas de clonage tâches / risques / budget-links). La `version` est calculée par projet via `MAX(version) + 1`. **`projects.update`**
- **POST /api/projects/:projectId/scenarios/:scenarioId/select** — Sélectionne la baseline du projet. Le scénario ciblé passe `SELECTED`, `isBaseline = true`, les autres scénarios du projet sont archivés. En cas de concurrence sur l’unicité `SELECTED`, l’API répond par un conflit maîtrisé. **`projects.update`**
- **POST /api/projects/:projectId/scenarios/:scenarioId/select-and-transition** — Workflow RFC-PROJ-SC-007 backend-only: sélectionne le scénario (baseline) **et** applique la transition projet vers `PLANNED` ou `IN_PROGRESS` dans une transaction unique. **`projects.update`**
  - Body exact:
    - `targetProjectStatus`: **requis**, valeurs autorisées `PLANNED | IN_PROGRESS`
    - `decisionNote`: optionnel, trimé, chaîne vide normalisée à `null`, max `2000`
    - `archiveOtherScenarios`: optionnel, accepté pour compatibilité mais ignoré côté métier (forcé à `true`)
  - Réponse JSON exacte:
    - `{ "scenarioId": "...", "projectId": "...", "selectedStatus": "SELECTED", "projectStatus": "PLANNED|IN_PROGRESS" }`
  - Comportement idempotent:
    - si le projet est déjà dans le `targetProjectStatus`, la requête réussit sans erreur et retourne l’état cible.
  - Compatibilité:
    - `POST /select` est conservé et ne met pas à jour le statut projet.
- **POST /api/projects/:projectId/scenarios/:scenarioId/archive** — Archive un scénario non baseline. Un scénario `SELECTED` ne peut pas être archivé directement ; il faut d’abord en sélectionner un autre. **`projects.update`**

Règles MVP :

- `status` est la source de vérité métier.
- `isBaseline` est un champ dérivé maintenu synchronisé côté serveur.
- Un seul scénario `SELECTED` par projet, garanti par transaction et par index unique partiel PostgreSQL.
- `POST /select` est autorisé au MVP tant que le projet est accessible dans le scope client ; la restriction future liée au workflow `PLANNED / IN_PROGRESS` relève de `RFC-PROJ-SC-007`.

Audits : **`project.scenario.created`**, **`project.scenario.updated`**, **`project.scenario.duplicated`**, **`project.scenario.selected`**, **`project.scenario.archived`**.

### Projections financières scénario (RFC-PROJ-SC-002) — `/api/projects/:projectId/scenarios/:scenarioId/financial-lines|financial-summary`

Lecture / écriture des lignes de projection **`ProjectScenarioFinancialLine`** ; aucune écriture dans le budget officiel ni génération d’événements financiers. Isolation **client actif** + `projectId` + `scenarioId` dans l’URL.

- **GET .../financial-lines** — Liste paginée `{ items, total, limit, offset }` ; tri par défaut **`createdAt` desc** ; query `limit` (1–100), `offset`. Chaque item inclut `budgetLine` et `projectBudgetLink` enrichis (`code`, `name`, pas d’ID seul comme seule donnée affichable côté UI). **`projects.read`**
- **POST .../financial-lines** — Création (`CreateProjectScenarioFinancialLineDto`) : `label`, `amountPlanned` (`IsNumberString`), `projectBudgetLinkId` / `budgetLineId` optionnels, montants optionnels, dates, `currencyCode` ISO 3 lettres. Refus si scénario `ARCHIVED`. **`projects.update`**
- **PATCH .../financial-lines/:lineId** — Mise à jour partielle ; mêmes règles de cohérence que la création ; refus si scénario `ARCHIVED`. **`projects.update`**
- **DELETE .../financial-lines/:lineId** — Suppression ; **`204 No Content`** ; refus si scénario `ARCHIVED`. **`projects.update`**
- **GET .../financial-summary** — Synthèse agrégée : `plannedTotal`, `forecastTotal` (fallback `forecast ?? planned` par ligne), `actualTotal` (`null` traité comme 0), `varianceVsBaseline`, `varianceVsActual`, `budgetCoverageRate` — définitions alignées sur [RFC-PROJ-SC-002](RFC/RFC-PROJ-SC-002%20%E2%80%94%20Scenario%20Financial%20Planning.md) §7. **`projects.read`** (pas d’audit en lecture)

Audits mutations lignes : **`project.scenario_financial_line.created`**, **`project.scenario_financial_line.updated`**, **`project.scenario_financial_line.deleted`**.

### Planification ressources scénario (RFC-PROJ-SC-003) — `/api/projects/:projectId/scenarios/:scenarioId/resource-plans|resource-summary`

Lecture / écriture des lignes de planification ressources **`ProjectScenarioResourcePlan`** ; aucune écriture dans les timesheets ni calcul capacité multi-scénarios. Isolation stricte **client actif** + `projectId` + `scenarioId` sur toutes les lectures/mutations.

- **GET .../resource-plans** — Liste paginée `{ items, total, limit, offset }` ; tri par défaut **`createdAt` desc** ; query `limit` (1–100), `offset`. Chaque item expose un nested `resource` enrichi (`id`, `name`, `code`, `type`) et les décimaux en string (`allocationPct`, `plannedDays`). **`projects.read`**
- **POST .../resource-plans** — Création (`CreateProjectScenarioResourcePlanDto`) : `resourceId` requis, `roleLabel`, `allocationPct`, `plannedDays`, dates, `notes`. Validation : `allocationPct` entre 0 et 100 inclus, `plannedDays >= 0`, `endDate >= startDate` ; refus si scénario `ARCHIVED`. Si `resourceId` n’appartient pas au `clientId` actif : **`404 NotFound`**. **`projects.update`**
- **PATCH .../resource-plans/:planId** — Mise à jour partielle (`resourceId` optionnel) ; mêmes règles de validation que la création ; refus si scénario `ARCHIVED`. **`projects.update`**
- **DELETE .../resource-plans/:planId** — Suppression ; **`204 No Content`** ; refus si scénario `ARCHIVED`. **`projects.update`**
- **GET .../resource-summary** — KPI agrégés (`ProjectScenarioResourceSummaryDto`) :
  - `plannedDaysTotal` (string) : somme des `plannedDays` (`null` traité comme 0)
  - `plannedCostTotal` (string) : somme des contributions `(plannedDays ?? 0) * dailyRate`, **uniquement** pour `resource.type === HUMAN` et `dailyRate` non nul (sinon contribution 0)
  - `plannedFtePeak` (`string | null`) : pic FTE calculé jour par jour (bornes `startDate` / `endDate` inclusives), somme quotidienne des `allocationPct/100`, maximum observé ; `null` si aucune ligne n’a simultanément `allocationPct`, `startDate`, `endDate`
  - `distinctResources` (number) : nombre de `resourceId` distincts. **`projects.read`**

Audits mutations lignes : **`project.scenario_resource_plan.created`**, **`project.scenario_resource_plan.updated`**, **`project.scenario_resource_plan.deleted`**. Aucun audit sur les lectures ni sur `GET .../resource-summary`.

### Capacity engine scénario (RFC-PROJ-SC-005) — `/api/projects/:projectId/scenarios/:scenarioId/capacity|capacity-summary|capacity/recompute`

Périmètre **backend only**. Capacité MVP figée à `100.00` par snapshot ; aucun calcul inter-projets, aucune absence/calendrier/timesheet, aucun recalcul implicite sur les GET. Scope strict **client actif** + `projectId` + `scenarioId`.

- **POST .../capacity/recompute** — Recalcule et remplace totalement les snapshots (`deleteMany + createMany`) en transaction Prisma ; refus si scénario `ARCHIVED`. Réponse exacte : `{ scenarioId: string, deletedCount: number, createdCount: number }`. Endpoint idempotent à état identique des resource plans. **`projects.update`**
- **GET .../capacity** — Liste paginée `{ items, total, limit, offset }`, tri par défaut `snapshotDate ASC, resourceId ASC`. Query supportée : `limit`, `offset`, `resourceId`. **`projects.read`**
- **GET .../capacity-summary** — KPI agrégés du scénario: `overCapacityCount`, `underCapacityCount`, `peakLoadPct`, `averageLoadPct`. **`projects.read`**

Règles de projection SC-005 :

- Un plan ressource contribue uniquement si `allocationPct`, `startDate`, `endDate` sont tous présents.
- Projection **jour par jour** sur l’intervalle inclusif `[startDate, endDate]`.
- Si plusieurs plans couvrent le même jour pour la même ressource: `plannedLoadPct = somme(allocationPct)`.
- `availableCapacityPct = "100"` (string).
- `variancePct = availableCapacityPct - plannedLoadPct`.
- `status` : `OVER_CAPACITY` si `variancePct < 0`, `OK` si `variancePct = 0`, `UNDER_CAPACITY` si `variancePct > 0`.
- Égalité évaluée sur la valeur décimale persistée (pas de tolérance).

Conventions de sérialisation décimale :

- Tous les décimaux Prisma sont sérialisés en **string** (jamais number):
  - Snapshot item: `plannedLoadPct`, `availableCapacityPct`, `variancePct`
  - Summary: `peakLoadPct`, `averageLoadPct`

DTO `GET .../capacity` (item) :

- `id`, `clientId`, `projectId`, `scenarioId`, `resourceId`, `snapshotDate`, `plannedLoadPct`, `availableCapacityPct`, `variancePct`, `status`
- `resource` (quand relation existante) : `{ id, name, type }`
- Cas sans snapshot : `items = []`

DTO `GET .../capacity-summary` :

- `overCapacityCount` (number)
- `underCapacityCount` (number)
- `peakLoadPct` (`string | null`)
- `averageLoadPct` (`string | null`)
- `OK` n’est pas exposé dans ce DTO.
- Cas sans snapshot : `overCapacityCount = 0`, `underCapacityCount = 0`, `peakLoadPct = null`, `averageLoadPct = null`

Audit :

- Mutation auditée : **`project.scenario_capacity.recomputed`** (resourceType `project_scenario_capacity`) avec volumes `deletedCount` et `createdCount`.
- Aucun audit sur `GET .../capacity` et `GET .../capacity-summary`.

### Risques scénario (RFC-PROJ-SC-006) — `/api/projects/:projectId/scenarios/:scenarioId/risks|risk-summary`

Périmètre **backend only**. Registre de risques de simulation strictement séparé de `ProjectRisk` (registre opérationnel). Scope strict **client actif** + `projectId` + `scenarioId`.

- **GET .../risks** — Liste paginée `{ items, total, limit, offset }`, tri par défaut `createdAt DESC`. Query supportée au MVP : `limit`, `offset` (aucun autre filtre). **`projects.read`**
- **POST .../risks** — Création ; retourne `ProjectScenarioRiskDto`. Validation: `probability` et `impact` bornés à `1..5`, `criticalityScore = probability * impact`. `riskTypeId` optionnel, validé via taxonomie client si fourni. Refus si scénario `ARCHIVED`. **`projects.update`**
- **PATCH .../risks/:riskId** — Mise à jour partielle ; retourne `ProjectScenarioRiskDto`. Recalcul systématique de `criticalityScore` après merge des valeurs finales si `probability` ou `impact` changent. Refus si scénario `ARCHIVED`. **`projects.update`**
- **DELETE .../risks/:riskId** — Suppression ; **`204 No Content`**. Refus si scénario `ARCHIVED`. **`projects.update`**
- **GET .../risk-summary** — Retourne `ProjectScenarioRiskSummaryDto`: `criticalRiskCount`, `averageCriticality`, `maxCriticality`. Seuil canonique: `criticalRiskCount = nombre de risques avec criticalityScore >= 15`. **`projects.read`**

DTO `ProjectScenarioRiskDto` :

- `id`, `clientId`, `scenarioId`, `riskTypeId`, `title`, `description`, `probability`, `impact`, `criticalityScore`, `mitigationPlan`, `ownerLabel`, `createdAt`, `updatedAt`
- `riskType` : `{ id, code, label } | null` (avec `label` dérivé du nom de taxonomie)

DTO `ProjectScenarioRiskSummaryDto` :

- `criticalRiskCount` (number)
- `averageCriticality` (`number | null`)
- `maxCriticality` (`number | null`)
- Cas sans risque: `criticalRiskCount = 0`, `averageCriticality = null`, `maxCriticality = null`

Audit :

- Mutations auditées uniquement:
  - **`project.scenario_risk.created`**
  - **`project.scenario_risk.updated`**
  - **`project.scenario_risk.deleted`**
- `resourceType` : `project_scenario_risk`
- Aucun audit sur `GET .../risks` et `GET .../risk-summary`.

### Planification Gantt scénario (RFC-PROJ-SC-004) — `/api/projects/:projectId/scenarios/:scenarioId/tasks|bootstrap-from-project-plan|timeline-summary`

Périmètre **backend only** : séparation stricte entre planning officiel (`ProjectTask`) et planning scénario (`ProjectScenarioTask`). Aucune mutation des `ProjectTask` ni du Gantt projet officiel.

- **GET .../tasks** — Liste paginée `{ items, total, limit, offset }` ; tri canonique **`orderIndex ASC, createdAt ASC`** ; query `limit` (1–100), `offset`. **`projects.read`**
- **POST .../tasks** — Création (`CreateProjectScenarioTaskDto`) ; retourne `ProjectScenarioTaskDto`. Validations : `taskType` dans `TASK|MILESTONE`, `endDate >= startDate`, `durationDays >= 0`, `dependencyIds` tableau string unique intra-scénario. **`projects.update`**
- **PATCH .../tasks/:taskId** — Mise à jour partielle (`UpdateProjectScenarioTaskDto`) ; retourne `ProjectScenarioTaskDto`. Même validations que création + rejet auto-dépendance (`taskId` dans `dependencyIds`). **`projects.update`**
- **DELETE .../tasks/:taskId** — Suppression ; **`204 No Content`**. **`projects.update`**
- **POST .../bootstrap-from-project-plan** — Initialise les tâches scénario depuis `ProjectTask`. Contrat réponse : `{ scenarioId, createdCount, skippedDependencyCount }`. Règle MVP : si le scénario contient déjà au moins une tâche, **`409 Conflict`** (pas de merge, pas de remplacement). **`projects.update`**
- **GET .../timeline-summary** — Retourne `ProjectScenarioTimelineSummaryDto` : `plannedStartDate`, `plannedEndDate`, `criticalPathDuration`, `milestoneCount`. **`projects.read`**

Règles SC-004 :

- `taskType` autorisé : `TASK` ou `MILESTONE`; `milestoneCount` = nombre de tâches `taskType = MILESTONE`.
- `dependencyIds` stocké en JSON tableau de strings ; `null` normalisé en `[]` ; doublons interdits ; dépendance absente interdite ; dépendance cross-scenario interdite ; auto-référence interdite.
- `durationDays` est stocké indépendamment (pas de recalcul implicite automatique via dates).
- Bootstrap mapping :
  - `sourceProjectTaskId <- ProjectTask.id`
  - `title <- ProjectTask.name`
  - `taskType <- MILESTONE` si la tâche source porte au moins un milestone lié, sinon `TASK`
  - `startDate <- ProjectTask.plannedStartDate`
  - `endDate <- ProjectTask.plannedEndDate`
  - `durationDays <- null`
  - `orderIndex <- index séquentiel selon l’ordre canonique de lecture`
  - `dependencyIds <- dependsOnTaskId` uniquement si la cible est copiée dans le lot, sinon dépendance ignorée et comptée dans `skippedDependencyCount`.
- Définition `timeline-summary` :
  - `plannedStartDate = min(startDate)` des tâches datées
  - `plannedEndDate = max(endDate)` des tâches datées
  - `criticalPathDuration` (MVP) = durée calendaire inclusive en jours entre `plannedStartDate` et `plannedEndDate`, sinon `null`.

Audits mutations tâches : **`project.scenario_task.created`**, **`project.scenario_task.updated`**, **`project.scenario_task.deleted`**, **`project.scenario_task.bootstrapped`** (resourceType `project_scenario_task`). Aucun audit sur les lectures ni sur `GET .../timeline-summary`.

### Points projet (RFC-PROJ-013) — `/api/projects/:projectId/reviews`

Isolation **client actif** + `projectId` dans l’URL ; le seul `reviewId` ne suffit pas à cibler une ressource.

- **GET /api/projects/:projectId/reviews** — Liste des points (tri par `reviewDate` desc, `createdAt` desc). Items **sans** `snapshotPayload` (charge allégée). **`projects.read`**
- **POST /api/projects/:projectId/reviews** — Création en brouillon (`ProjectReviewType`, `reviewDate`, `title`, `executiveSummary`, `contentPayload` optionnel, participants, etc.). **`projects.update`**
- **GET /api/projects/:projectId/reviews/:reviewId** — Détail. `snapshotPayload` **toujours présent** dans le JSON : `null` si `status !== FINALIZED`, objet figé si finalisé. **`projects.read`**
- **PATCH /api/projects/:projectId/reviews/:reviewId** — Mise à jour **uniquement** en statut brouillon. **`projects.update`**
- **POST /api/projects/:projectId/reviews/:reviewId/finalize** — Finalisation : snapshot serveur en transaction, statut `FINALIZED`. Audits **`project.review.finalized`**. **`projects.update`**
- **POST /api/projects/:projectId/reviews/:reviewId/cancel** — Annulation depuis brouillon. Audit **`project.review.cancelled`**. **`projects.update`**

**Type `POST_MORTEM` (retour d’expérience)** : création autorisée seulement si le projet est **`COMPLETED`**, **`CANCELLED`** ou **`ARCHIVED`** ; si le projet est dans l’un de ces états, toute **nouvelle** revue doit être de ce type. **`nextReviewDate`** ne doit pas être renseigné (pas de prochain point après un REX). Le corps peut inclure **`contentPayload`** avec un objet **`postMortem`** (structure côté client).

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

## Équipes — associations collaborateur ↔ compétence (RFC-TEAM-004)

Module Nest `skills` : isolation **client actif** (`X-Client-Id`) ; pas de `clientId` dans le body. Réponses listes : `{ items, total, limit, offset }`. Détail : [RFC-TEAM-004](RFC/RFC-TEAM-004%20%E2%80%94%20Comp%C3%A9tences%20des%20collaborateurs.md).

**Permissions** : lecture **`skills.read`** ; écriture (création, mise à jour, suppression, bulk, validate/invalidate) **`skills.update`**.

### Routes nestées collaborateur

- **GET** `/api/collaborators/:collaboratorId/skills` — Liste des compétences du collaborateur (filtres query : `search`, `categoryId`, `level`, `source`, `validated`, `includeArchived`, pagination, `sortBy` / `sortOrder`). **`skills.read`**
- **POST** `/api/collaborators/:collaboratorId/skills` — Création d’une association (body : `skillId`, champs optionnels niveau, source, commentaire, `reviewedAt`). **`skills.update`**
- **POST** `/api/collaborators/:collaboratorId/skills/bulk` — Création en lot (`items[]`, max 50). Réponse : `created`, `skipped`, `totalRequested`. **`skills.update`**
- **PATCH** `/api/collaborators/:collaboratorId/skills/:id` — Mise à jour partielle de l’association. **`skills.update`**
- **DELETE** `/api/collaborators/:collaboratorId/skills/:id` — Suppression de l’association. **`skills.update`**
- **PATCH** `/api/collaborators/:collaboratorId/skills/:id/validate` — Validation manager (`validatedByUserId`, `validatedAt`). **`skills.update`**
- **PATCH** `/api/collaborators/:collaboratorId/skills/:id/invalidate` — Retrait de validation. **`skills.update`**

### Vue inverse par compétence

- **GET** `/api/skills/:skillId/collaborators` — Collaborateurs porteurs de la compétence (filtres : `search`, `level`, `validated`, `includeArchived`, pagination). Skill **`ARCHIVED`** : **404** si `includeArchived` faux ; **200** si `includeArchived` true. **`skills.read`**

**Erreurs courantes :** 400 (collaborateur non actif pour écriture, skill archivée pour création, bulk invalide), 404 (collaborateur/skill/association hors scope), 409 (doublon sur POST unitaire `(collaboratorId, skillId)`).

---

## Équipes — taxonomie des activités (RFC-TEAM-006) — `/api/activity-types`

Module Nest `activity-types` : référentiel **`ActivityType`** par client (axe sémantique **`ActivityTaxonomyKind`** : `PROJECT`, `RUN`, `SUPPORT`, `TRANSVERSE`, `OTHER`). Isolation **client actif** (`X-Client-Id`) ; pas de `clientId` dans le body. Réponses liste : `{ items, total, limit, offset }` ; tri serveur fixe : `sortOrder` asc puis `name` asc. Liste : query `limit` (défaut 20, max 100), `offset` (défaut 0), filtres optionnels `kind`, `includeArchived` (défaut `false` — exclut les lignes archivées), **`defaultsOnly`** (booléen, optionnel — si `true`, ne retourne que les lignes avec **`isDefaultForKind: true`**, utile pour listes réduites type UI temps réalisé), `search` (nom et code). Détail : [RFC-TEAM-006](RFC/RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md).

**Permissions** : lecture **`activity_types.read`** ; création, mise à jour, archive, restauration **`activity_types.manage`**.

**Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.

**Réponses** : champs minimaux `id`, `clientId`, `kind` (valeur canonique enum), `name`, `code` (nullable, stocké en majuscules si renseigné), `description`, `sortOrder`, `isDefaultForKind`, `archivedAt`, `createdAt`, `updatedAt`.

- **GET** `/api/activity-types` — Liste paginée. **`activity_types.read`**
- **POST** `/api/activity-types` — Création. **`activity_types.manage`**
- **GET** `/api/activity-types/:id` — Détail. **`activity_types.read`**
- **PATCH** `/api/activity-types/:id` — Mise à jour partielle. **`activity_types.manage`**
- **PATCH** `/api/activity-types/:id/archive` — Archivage logique ; **200** sans écriture si déjà archivé (idempotent). **`activity_types.manage`**
- **PATCH** `/api/activity-types/:id/restore` — Réactivation ; **200** sans écriture si déjà actif (idempotent). **`activity_types.manage`**

**Erreurs courantes :** 400 (validation DTO), 404 (hors scope client), 409 (code métier déjà utilisé pour ce client, nom vide).

---

## Équipes — temps réalisé (RFC-TEAM-009) — `/api/resource-time-entries`

> **Historique** : le staffing planifié (ex. RFC-TEAM-007 / TEAM-008, modèle `TeamResourceAssignment`, routes `/api/team-resource-assignments` et `/api/projects/:projectId/resource-assignments`) a été **retiré** du produit ; la table Prisma correspondante est supprimée par migration `20260404213000_drop_team_resource_assignment`. Référence conservée : [RFC-TEAM-007](RFC/RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md), [RFC-TEAM-008](RFC/RFC-TEAM-008%20%E2%80%94%20Staffing%20projet%20par%20manager%20responsable%20projet.md) (specs historiques).

Module Nest `resource-time-entries` : entité **`ResourceTimeEntry`** (temps **réalisé**). Isolation **client actif** ; pas de `clientId` dans le body. Réponses liste : `{ items, total, limit, offset }` ; tri par défaut : `workDate` desc, `id` desc. Liste : `limit` (défaut 20, max 100), `offset` (défaut 0), filtres **`resourceId`**, `projectId`, **`status`** (`TimeEntryStatus`), fenêtre **`from` + `to`** (ISO `YYYY-MM-DD`, les deux obligatoires ensemble ou omis ensemble — sinon **400**).

**Règles métier** : **`resourceId`** doit désigner une **Resource HUMAN** du client (**404** sinon). `projectId` / `activityTypeId` optionnels mais validés en scope client si renseignés. Création : `workDate` (ISO date-time), `durationHours` (décimal 0,01–999999,99), `status` optionnel (défaut **`DRAFT`**).

**Permissions** : **`resources.read`** (liste, détail) ; **`resources.update`** (create, patch, delete) — module **Ressources** (`ModuleAccessGuard` + `PermissionsGuard`).

**Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.

**Réponse entrée** : `id`, `clientId`, `resourceId`, `resourceDisplayName`, `workDate` (ISO), `durationHours`, `projectId`, `projectName`, `projectCode`, `activityTypeId`, `activityTypeName`, `status`, `notes`, `createdAt`, `updatedAt`.

- **GET** `/api/resource-time-entries` — Liste paginée. **`resources.read`**
- **POST** `/api/resource-time-entries` — Création. **`resources.update`**
- **GET** `/api/resource-time-entries/:id` — Détail. **`resources.read`**
- **PATCH** `/api/resource-time-entries/:id` — Mise à jour partielle. **`resources.update`**
- **DELETE** `/api/resource-time-entries/:id` — **Suppression physique** ; audit `resource_time_entry.deleted`. **`resources.update`**

**Erreurs courantes :** 400 (validation DTO, fenêtre `from`/`to` invalide, `workDate` invalide), 404 (entrée, projet ou type d’activité hors scope, ressource non HUMAN).

**UI Next.js** : page `/teams/time-entries` — `apps/web/src/app/(protected)/teams/time-entries/page.tsx` ; client API et hooks — `apps/web/src/features/teams/resource-time-entries/`. Comportement côté écran (MVP) : grille **mensuelle** (saisie par **fraction de journée** 0–1, journée type 7,5 h — `durationHours` dérivé à l’enregistrement) ; **projets** chargés via **`GET /api/projects`** avec **`myProjectsOnly=true`** (périmètre équipe / « mes projets ») et **filtre statut projet** côté UI (défaut **En cours** — `IN_PROGRESS`, ou tous les statuts) ; **types d’activité** via **`GET /api/activity-types?defaultsOnly=true`** pour les lignes « défaut » par axe taxonomique (RFC-TEAM-006) ; saisie **décimale** (point ou virgule) avec brouillon jusqu’au blur ; colonnes redimensionnables ; recopie type Excel sur la ligne ; distinction visuelle **week-ends**. Verrouillage du mois après validation : voir **`/api/resource-timesheet-months`** ci-dessous.

---

## Équipes — fiche temps mensuelle (RFC-TEAM-009) — `/api/resource-timesheet-months`

Module Nest : persistance **`ResourceTimesheetMonth`** par ressource et mois calendaire (`yearMonth` = `YYYY-MM`) — statut du mois (ex. soumis / lecture seule), règles de **qui peut soumettre** ou **déverrouiller** (manager / admin) dans le service. Isolation **client actif**.

**Permissions** : lecture **`resources.read`** ; soumission mois **`resources.update`** ; déverrouillage **`collaborators.read`** (aligné contrôleur actuel).

**Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.

- **GET** `/api/resource-timesheet-months/:resourceId/:yearMonth` — État du mois pour la ressource (ex. `status`, indicateurs `canSubmit` / `canUnlock`). **`resources.read`**
- **POST** `/api/resource-timesheet-months/:resourceId/:yearMonth/submit` — Valider / soumettre le mois (saisie figée côté métier). **`resources.update`**
- **POST** `/api/resource-timesheet-months/:resourceId/:yearMonth/unlock` — Déverrouiller le mois (manager). **`collaborators.read`**

**Erreurs courantes :** 400 (`yearMonth` invalide), 403 / métier si droit de soumission ou déverrouillage insuffisant, 404 (ressource hors scope).

Code : `apps/api/src/modules/resource-time-entries/resource-timesheet-months.controller.ts`.

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

### Taille max. fichiers métier (plateforme) — `GET|PATCH /api/platform/upload-settings`

Plafond **unique** (octets) pour : **analyse d’import budget** (`POST /api/budget-imports/analyze`) et **pièces jointes procurement** (commandes / factures). Les autres uploads (avatar, logo fournisseur, etc.) gardent des limites fixes plus basses dans le code.

**Guards** : `JwtAuthGuard`, `PlatformAdminGuard` — **pas** de `X-Client-Id`.

**Variable d’environnement** : **`PLATFORM_UPLOAD_MAX_BYTES_CEILING`** (octets, optionnel) — plafond absolu au-delà duquel l’admin plateforme ne peut pas monter la limite (défaut applicatif **100 MiB** si absent). Nécessite un **redémarrage API** pour être prise en compte.

**GET (200)** : `id`, `maxUploadBytes`, `minUploadBytes` (borne basse, ex. 1 MiB), `maxUploadBytesCeiling` (borne haute effective), `updatedAt`.

**PATCH** : JSON `{ "maxUploadBytes": <entier> }` — doit être entre `minUploadBytes` et `maxUploadBytesCeiling`. Met à jour le cache runtime (Multer + validations métier) **sans redémarrage**.

---

### Stockage procurement (plateforme) — `GET|PATCH /api/platform/procurement-s3-settings`

RFC-034 + **RFC-035** : configuration **globale** du stockage des pièces jointes **commandes** et **factures**. Deux backends : **disque local** sur le serveur API (défaut dans Docker Compose du dépôt) ou **S3-compatible** (AWS, MinIO, etc.). Accès binaire **uniquement** via l’API métier ; pas d’URL signée exposée au navigateur métier.

**Variables d’environnement (priorité runtime)** :

- **`PROCUREMENT_STORAGE_DRIVER`** : `local` \| `s3` (insensible à la casse) — **repli** si la ligne plateforme est absente ; sinon le driver suit le champ DB `storageDriver` (admin).
- **`PROCUREMENT_LOCAL_ROOT`** : répertoire racine des fichiers (local) — **prime** sur le champ DB `localRoot` lorsqu’il est défini.
- **`PROCUREMENT_S3_*`** : repli / config S3 lorsque le driver effectif est **s3** (voir détail historique RFC-034) ; résolution DB si `enabled` et champs complets, sinon env.
- **`PROCUREMENT_CLIENT_DOCUMENTS_BUCKET_PREFIX`** (optionnel) : secours si le champ plateforme `clientDocumentsBucketPrefix` est vide ; sinon la **base** prime. Les buckets par client sont nommés `{préfixe}-{slug}` (contraintes S3 : minuscules, tirets, longueur ≤ 63).

**Guards** : `JwtAuthGuard`, `PlatformAdminGuard` — **pas** de `X-Client-Id`.

**GET (200)** : ligne `PlatformProcurementS3Settings` (créée à la volée si absente) + **`effectiveDriver`** (`local` \| `s3`) + **`effectiveLocalRootSource`** (`env` \| `db` \| `none`) + **`effectiveSource`** (`db` \| `env` \| `none`, origine de la config **S3** lorsque applicable).

**Corps (aperçu)** : `id`, `enabled`, `storageDriver`, `localRoot`, `endpoint`, `region`, `accessKey`, **`hasSecret`** (booléen), `bucket` (référence plateforme pour contrôle de connexion / compat), **`clientDocumentsBucketPrefix`** (préfixe des noms de buckets **dédiés client** en S3 ; peut être `null`, défaut `starium-docs`), `useSsl`, `forcePathStyle`, `updatedAt`. Le **secret** (`secretKey`) n’est **jamais** renvoyé, ni en clair ni chiffré.

**PATCH** : JSON partiel — `enabled`, `storageDriver` (`LOCAL` \| `S3`), `localRoot`, `endpoint`, `region`, `accessKey`, `secretKey` (écriture seule ; chaîne vide ou omission pour ne pas changer), `bucket`, **`clientDocumentsBucketPrefix`**, `useSsl`, `forcePathStyle`. Si `enabled` est vrai après enregistrement : contrôle **répertoire local inscriptible** si le driver effectif est local, sinon contrôle S3 (`HeadBucket` sur le bucket **plateforme** ; création si réponse 404). En cas d’échec : **400** avec message métier. Réponse : même forme que **GET**.

**Stockage par client** : en **local**, les fichiers sont sous `{racine}/{clientId}/Commandes|Factures|Contrats/…`. En **S3**, **un bucket par client** (nom `{préfixe}-{slug}`), clés objet `Commandes|Factures|Contrats/{uuid}/…`. `Client.documentsBucketName` enregistre le **nom du bucket client** après provisionnement (création client ou premier upload).

---

### Commandes et factures — lecture fiche (client actif)

Routes **client-scopées** : **JWT** + **`X-Client-Id`** + module procurement.

| Méthode | Route | Permission | Description |
|---------|--------|------------|-------------|
| `GET` | `/api/purchase-orders/:id` | `procurement.read` | Détail d’une commande (fournisseur, montants, statut, lien ligne budget si présent). |
| `GET` | `/api/invoices/:id` | `procurement.read` | Détail d’une facture (fournisseur, montants, TVA, lien commande / ligne budget si présents). |

Les listes paginées restent sur `GET /api/purchase-orders` et `GET /api/invoices` (query params selon DTO backend).

---

### Pièces jointes procurement — commandes et factures (RFC-034)

Routes **client-scopées** : **JWT** + **`X-Client-Id`** + module procurement + permissions ci-dessous. Réponses **sans** champs techniques (`objectKey`, `storageBucket`, `checksumSha256`).

**Permissions (verrou)** :

| Méthode | Ressource | Permission |
|---------|-----------|------------|
| `GET` | `.../attachments` | `procurement.read` |
| `GET` | `.../attachments/:attachmentId/download` | `procurement.read` |
| `POST` | `.../attachments` | `procurement.update` |
| `POST` | `.../attachments/:attachmentId/archive` | `procurement.update` |

**Commandes**

- `GET /api/purchase-orders/:id/attachments` — liste des pièces **actives**.
- `POST /api/purchase-orders/:id/attachments` — `multipart/form-data` : champ fichier **`file`** ; champs optionnels **`name`**, **`category`** (enum Prisma `ProcurementAttachmentCategory`). Types MIME autorisés : PDF, PNG, JPEG ; taille max **15 Mo** (côté API).
- `GET /api/purchase-orders/:id/attachments/:attachmentId/download` — flux binaire, `Content-Disposition: attachment`.
- `POST /api/purchase-orders/:id/attachments/:attachmentId/archive` — archive logique (`ARCHIVED`, exclue des listes actives).

**Factures** — mêmes conventions sur :

- `GET|POST /api/invoices/:id/attachments`
- `GET /api/invoices/:id/attachments/:attachmentId/download`
- `POST /api/invoices/:id/attachments/:attachmentId/archive`

**Audit** (exemples d’actions) : `procurement_attachment.uploaded`, `procurement_attachment.downloaded`, `procurement_attachment.archived`, `procurement_attachment.access_denied`, `procurement_attachment.archive_denied`.

---

### Contrats fournisseur (RFC-036) — `/api/contracts`

Routes **client-scopées** : **JWT** + **`X-Client-Id`** + module **`contracts`** + permissions ci-dessous. Chaque contrat est rattaché à un **fournisseur** du même client. Référence **`reference`** unique par client. Le champ **`kind`** est un **code** (catalogue plateforme + types propres au client) ; les réponses exposent aussi **`kindLabel`** pour l’affichage.

| Méthode | Route | Permission | Description |
|---------|--------|------------|-------------|
| `GET` | `/api/contracts` | `contracts.read` | Liste paginée (`limit`, `offset`, `supplierId`, `status`, `expiresBefore`, `search`). |
| `GET` | `/api/contracts/supplier-options` | `contracts.read` **ou** `contracts.create` **ou** `contracts.update` | Liste fournisseurs du client (mêmes filtres que `GET /api/suppliers`) pour formulaires / filtres contrat **sans** exiger `procurement.read` (le `ModuleAccessGuard` n’autorise qu’un module par route). |
| `GET` | `/api/contracts/supplier/:supplierId` | idem | Détail fournisseur (même forme que `GET /api/suppliers/:id`) pour libellés. |
| `GET` | `/api/contracts/kind-types` | `contracts.read` **ou** `contracts.create` **ou** `contracts.update` | Liste fusionnée des types de contrat (catalogue plateforme + types client **actifs**) pour sélecteurs. |
| `POST` | `/api/contracts/kind-types` | `contracts.kind_types.manage` | Création d’un type **propre au client** (code unique vs plateforme et vs autres types du client). |
| `PATCH` | `/api/contracts/kind-types/:typeId` | `contracts.kind_types.manage` | Mise à jour (libellé, code, ordre, désactivation). |
| `DELETE` | `/api/contracts/kind-types/:typeId` | `contracts.kind_types.manage` | Désactivation logique (`isActive: false`). |
| `GET` | `/api/contracts/:id` | `contracts.read` | Détail + fournisseur (`name`, `code`, catégorie si présente). |
| `POST` | `/api/contracts` | `contracts.create` | Création (DTO validé, `kind` = code catalogue ; montants informatifs en chaîne décimale). |
| `PATCH` | `/api/contracts/:id` | `contracts.update` | Mise à jour partielle ; transitions de statut contrôlées (422 si interdite). |
| `DELETE` | `/api/contracts/:id` | `contracts.delete` | Clôture logique : statut **TERMINATED** (idempotent si déjà résilié). |

**Pièces jointes** (même moteur de stockage que la GED procurement — local / S3, pas d’URL signée navigateur) :

| Méthode | Route | Permission |
|---------|--------|------------|
| `GET` | `/api/contracts/:contractId/attachments` | `contracts.read` ou `contracts.update` |
| `POST` | `/api/contracts/:contractId/attachments` | `contracts.update` — `multipart/form-data` : **`file`**, optionnels **`name`**, **`category`** (`ContractAttachmentCategory`). |
| `GET` | `.../attachments/:attachmentId/download` | `contracts.read` ou `contracts.update` |
| `PATCH` | `.../attachments/:attachmentId/archive` | `contracts.update` |

**Audit** (exemples) : `contract.created`, `contract.updated`, `supplier_contract_kind_type.created`, `supplier_contract_kind_type.updated`, `contract_attachment.uploaded`, `contract_attachment.downloaded`, `contract_attachment.archived`, `contract_attachment.access_denied`, `contract_attachment.archive_denied`.

---

### Identifiants Azure AD par client Starium — `GET|PUT /api/clients/active/microsoft-oauth`

Lecture / mise à jour des champs **BYO** sur le `Client` actif : ID d’application, tenant d’autorité optionnel, secret (le secret n’est pas renvoyé en lecture ; indicateur `hasClientSecret`). Retourne aussi l’URI de redirection et les scopes **effectifs** issus de la config plateforme (`platformRedirectUri`, `graphScopes`).

**Headers** : JWT + **`X-Client-Id`** (obligatoire).

**Guards** : `ActiveClientGuard`, `MicrosoftIntegrationAccessGuard`, `@RequirePermissions('projects.update')` si l’utilisateur n’est pas **client admin** (même logique que `/api/microsoft/auth/url`).

**Réponse GET (200)** : champs métier sans secret en clair ; **PUT** : 200 avec corps aligné sur le GET.
