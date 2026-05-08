# Mode opératoire — Administrateur plateforme (`PLATFORM_ADMIN`)  
## Rôles (RBAC global) et périmètre ACL

Ce document décrit **ce que fait réellement** un utilisateur avec `platformRole = PLATFORM_ADMIN` dans Orchestra, pour la **gestion des rôles** (catalogue global) et le **lien avec les ACL** (qui restent **côté client**). Références API : [docs/API.md](../API.md) ; implémentation : `apps/api/src/modules/roles/platform-roles.controller.ts`, `apps/api/src/common/guards/platform-admin.guard.ts`.

---

## 1. Prérequis et contexte HTTP

| Élément | Règle |
|--------|--------|
| Authentification | `Authorization: Bearer <accessToken>` valide |
| Rôle | `platformRole === PLATFORM_ADMIN` sur le JWT (voir `GET /api/me`, RFC-014-2) |
| Client actif | **Non requis** sur les routes `/api/platform/*` : ne pas s’appuyer sur `X-Client-Id` pour ces opérations |

---

## 2. Rôles métier **globaux** (catalogue plateforme)

Les rôles **globaux** (`Role.scope = GLOBAL`) sont administrés **uniquement** via le préfixe **`/api/platform/roles`**.

| Action | Méthode et route | Remarque |
|--------|------------------|----------|
| Lister les rôles globaux | `GET /api/platform/roles` | Catalogue transversal |
| Créer un rôle global | `POST /api/platform/roles` | Body validé par DTO (`CreateRoleDto`) |
| Détail d’un rôle | `GET /api/platform/roles/:id` | Inclut les métadonnées utiles au détail (dont permissions côté service) |
| Mettre à jour un rôle | `PATCH /api/platform/roles/:id` | Nom / description selon DTO |
| Supprimer un rôle | `DELETE /api/platform/roles/:id` | `204` si succès ; règles métier (rôle système, affectations) appliquées par le service |
| Lister **toutes** les permissions référencées côté plateforme | `GET /api/platform/roles/permissions` | Vue catalogue (non filtrée par un client) |
| Remplacer les permissions d’un rôle global | `PUT /api/platform/roles/:id/permissions` | Body `UpdateRolePermissionsDto` (`permissionIds`) |

**Guards** : `JwtAuthGuard` → `PlatformAdminGuard` (pas `ActiveClientGuard`).

**Audit** : les mutations passent par `RolesService` avec contexte acteur (`actorUserId`, meta requête) lorsque exposé par les décorateurs.

---

## 3. Ce que le **plateforme admin** ne fait **pas** (ACL ressource)

| Sujet | Comportement V1 |
|--------|------------------|
| **ACL ressource** (`ResourceAcl`) | **Aucune** route `/api/platform/...` pour créer ou lister des ACL métier. L’administration des ACL est **réservée au client** : `JwtAuthGuard` + `ActiveClientGuard` + `ClientAdminGuard` sur `/api/resource-acl/...` (RFC-ACL-005). |
| **Rôles par client** (`Role.scope = CLIENT`) | Gérés par le **client admin** via `/api/roles`, `/api/permissions`, `/api/users/:id/roles` avec `X-Client-Id` (voir [mode-operatoire-client-admin-roles-acl.md](./mode-operatoire-client-admin-roles-acl.md)). |
| **Diagnostic « pourquoi refusé ? »** | Le plateforme admin peut utiliser les routes **diagnostic** ciblant un `clientId` explicite : `GET /api/platform/clients/:clientId/access-diagnostics/effective-rights` (RFC-ACL-011, voir `docs/API.md` §5.05). Cela **n’édite** pas les ACL ; ça **explique** la combinaison licence / abonnement / module / visibilité / RBAC / ACL. |

En résumé : **plateforme = catalogue global des rôles + permissions** ; **ACL = toujours dans le périmètre d’un client**, par un `CLIENT_ADMIN`.

---

## 4. Rattachement utilisateurs / clients et cas du dernier `CLIENT_ADMIN`

- La **gestion des organisations** et des rattachements (invitations, utilisateurs côté client) relève des routes documentées sous `/api/clients`, `/api/platform/users`, etc. (voir `docs/API.md`).
- La **rétrogradation du dernier `CLIENT_ADMIN`** d’un client depuis l’interface « client actif » est **refusée** par l’API métier (`UsersService.update`) : le message d’erreur renvoie explicitement vers le **flux plateforme**. Le plateforme admin doit utiliser les **flux prévus** (gestion client / utilisateurs plateforme) pour ce cas limite — pas l’API ACL.

---

## 5. Bonnes pratiques

1. **Modifier un rôle global** après l’avoir rattaché à des utilisateurs sur plusieurs clients : vérifier l’impact sur tous les clients qui réutilisent ce rôle (permissions agrégées au moment de la requête).
2. **Ne pas confondre** `ClientUser.role` (`CLIENT_ADMIN` vs `CLIENT_USER`) et **rôles métier** (`UserRole` → rôles `CLIENT` ou `GLOBAL` avec permissions). Le premier contrôle l’**administration client** ; le second contrôle le **RBAC métier** (menus, routes avec `PermissionsGuard`).
3. Pour un incident « accès refusé » sur un client donné : utiliser le **diagnostic effectif** plateforme avec le `clientId` de la route, plutôt que d’imaginer une API ACL plateforme inexistante.

---

## 6. Références croisées

- [docs/API.md](../API.md) — sections clients, utilisateurs plateforme, diagnostic ACL-011, license-reporting ACL-012 si besoin métier.
- [RFC-ACL-005](../RFC/RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) — périmètre technique ACL (strictement client-admin + client actif).
- [RFC-ACL-011](../RFC/RFC-ACL-011%20%E2%80%94%20Matrice%20des%20droits%20effectifs.md) — diagnostic consolidé.
