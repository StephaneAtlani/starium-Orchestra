# Administration RBAC client (RFC-023)

Ce document décrit le module **Administration client** : gestion des rôles métier, des permissions et de l’assignation des rôles aux membres du client actif. Référence : [RFC-023 — Client RBAC Administration](../RFC/RFC-023%20—%20Client%20RBAC%20Administration.md).

---

## 1. Objectif

Permettre au **Client Admin** de :

- créer, modifier et supprimer des **rôles métier** dans son client actif ;
- associer des **permissions** (modules activés) à ces rôles ;
- **assigner** ces rôles aux utilisateurs du client (liste membres) ;
- tout cela **sans quitter le périmètre du client actif** (X-Client-Id, guards).

Le Client Admin ne gère que les rôles de son client ; le backend est la source de vérité (permissions, appartenance client, rôle système).

### 1.1 Positionnement du rôle global

Le module RBAC client ne gère **pas** le rôle global plateforme :

- `User.platformRole` (`PLATFORM_ADMIN` ou `null`) reste géré par les flux plateforme.
- Les écrans et routes de ce module se basent exclusivement sur le **client actif** (`X-Client-Id`) et le rôle de rattachement (`ClientUser.role`).
- Un utilisateur `PLATFORM_ADMIN` n’a pas d’élévation automatique sur le RBAC d’un client tant qu’il n’a pas un rattachement actif adapté sur ce client.

---

## 2. Règles métier

### 2.1 Rôles système

Les rôles créés par les **profils par défaut** (voir [default-profiles.md](../default-profiles.md)) ont `isSystem = true` :

- **Lecture seule** côté UI : pas d’édition du nom, de la description ni des permissions.
- **Backend** : PATCH `/api/roles/:id`, PUT `/api/roles/:id/permissions` et DELETE `/api/roles/:id` → **403 Forbidden** si `isSystem = true`.
- Le bouton « Supprimer » reste visible mais **désactivé** avec un tooltip explicatif.

### 2.2 Suppression d’un rôle

- **403** si le rôle est système.
- **409 Conflict** si le rôle est encore assigné à au moins un utilisateur.
- Sinon : suppression et enregistrement en audit.

### 2.3 Permissions disponibles

`GET /api/permissions` ne retourne que les permissions des **modules activés** pour le client actif. L’édition des permissions d’un rôle (PUT) n’accepte que des `permissionIds` dans ce sous-ensemble.

### 2.4 Assignation des rôles

- `PUT /api/users/:id/roles` remplace la liste des rôles de l’utilisateur **dans le client actif**.
- Tous les `roleIds` doivent appartenir au client actif ; l’utilisateur ciblé doit être membre du client actif, sinon 404.

---

## 3. API (résumé)

| Ressource              | Méthodes | Description |
|------------------------|----------|-------------|
| Rôles                  | GET, POST /api/roles | Liste et création |
| Détail rôle            | GET, PATCH, DELETE /api/roles/:id | Détail (avec `permissionIds`), mise à jour, suppression |
| Permissions disponibles| GET /api/permissions | Liste filtrée par modules activés |
| Permissions d’un rôle  | PUT /api/roles/:id/permissions | Remplacement de la liste |
| Utilisateurs (membres) | GET /api/users | Liste des membres du client (Client Admin) |
| Rôles d’un utilisateur | GET, PUT /api/users/:id/roles | Lecture et remplacement des rôles assignés |

**Headers requis** (routes client-scopées) : `Authorization: Bearer <accessToken>`, `X-Client-Id: <clientId>`.

**Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ClientAdminGuard`.

Détail des contrats et codes d’erreur : [API.md §9–12](../API.md#9-gestion-des-rôles-métier--apiroles).

---

## 4. Frontend

### 4.1 Navigation

Section **« Administration client »** (visible uniquement si `activeClient?.role === 'CLIENT_ADMIN'`) :

- **Administration** → `/client/administration` (page d’accueil : cartes Membres, Rôles, **Microsoft 365**)
- Depuis cette page : **Membres** → `/client/members`, **Rôles** → `/client/roles`, **Microsoft 365** → `/client/administration/microsoft-365` (configuration OAuth par client Starium, alignée [RFC-PROJ-INT-003](../RFC/RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md))

Config : [apps/web/src/config/navigation.ts](../../apps/web/src/config/navigation.ts).

### 4.2 Structure (feature client-rbac)

Tout le code RBAC client est regroupé dans un seul feature :

```
apps/web/src/features/client-rbac/
├── api/                    # Appels HTTP uniquement
│   ├── roles.ts            # getRoles, getRole, createRole, updateRole, deleteRole, updateRolePermissions
│   ├── permissions.ts      # getPermissions
│   └── user-roles.ts       # getClientMembers, getUserRoles, updateUserRoles
├── components/             # Composants UI
│   ├── role-form.tsx       # Formulaire nom + description (création / édition)
│   ├── role-permissions-editor.tsx  # Checkboxes permissions + Enregistrer
│   ├── roles-list.tsx      # Tableau rôles + Actions
│   ├── members-list.tsx    # Tableau membres + bouton Rôles
│   ├── user-roles-dialog.tsx        # Dialog assignation rôles (multi-select)
│   ├── role-create-page.tsx
│   └── role-detail-page.tsx
├── hooks/                  # TanStack Query (queries + mutations)
├── schemas/role.schema.ts   # Validation Zod (formulaire rôle)
├── types.ts                 # Types alignés sur les réponses API
└── query-keys.ts            # Clés de cache (toutes incluent activeClientId)
```

**Pages** (Server Components, dans `app/(protected)/client/`) :

- `members/page.tsx` → liste membres + dialog assignation
- `roles/page.tsx` → liste rôles
- `roles/new/page.tsx` → création rôle
- `roles/[id]/page.tsx` → détail rôle (nom, description, permissions)

### 4.3 Cache et client actif

- Toutes les **query keys** incluent `activeClientId` pour isoler les données par client.
- **Queries conditionnées** : `useRole` et `useUserRoles` utilisent aussi `roleId` / `userId` dans `enabled` pour éviter les appels incomplets.
- Les **invalidations** après mutations suivent le plan (liste rôles, détail rôle, membres, user-roles).

### 4.4 Envoi de X-Client-Id

La logique est centralisée dans **`getXClientIdHeaderValue`** ([apps/web/src/lib/api-client.ts](../../apps/web/src/lib/api-client.ts)) :

- **Règle** : toutes les URLs sous `/api/` reçoivent le header `X-Client-Id` si un client actif est défini, **sauf** les routes exclues (auth, me, platform, clients).
- **Exclusions** : `/api/auth/`, `/api/me`, `/api/me/clients`, `/api/me/default-client`, `/api/platform/`, `/api/clients`.
- Utilisée par `apiFetch` et par **createAuthenticatedFetch** ([authenticated-fetch.ts](../../apps/web/src/lib/authenticated-fetch.ts)), qui est le fetch utilisé par les appels métier.

---

## 5. Audit

Les actions suivantes sont enregistrées dans les **audit logs** (contexte acteur : userId, meta) :

- `role.created`
- `role.updated`
- `role.deleted`
- `role.permissions.updated`
- `user.roles.updated` (module user-roles)

---

## 6. Profils par défaut

Les rôles système sont créés à la création du client (voir [default-profiles.md](../default-profiles.md)). Leur **nom et description** ne sont pas modifiés dans le cadre de RFC-023 ; une évolution future (alignement noms RFC §14) pourra faire l’objet d’une tâche dédiée.
