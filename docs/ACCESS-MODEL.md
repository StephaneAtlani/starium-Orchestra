# Modèle d’accès (RFC-ACL-014)

Ce document complète la section **§11** de `docs/API.md` avec une vue produit : **ce qui est en production** vs **la cible organisationnelle** (RFC-ORG-001).

## Modèle opérationnel actuel

### Six contrôles canoniques

Pour une intention donnée (`READ`, `WRITE`, `ADMIN`), l’évaluation effective combine jusqu’à :

1. **Licence utilisateur** (`USER_LICENSE`) — statut membre, type READ_ONLY / READ_WRITE, dates.
2. **Abonnement client** (`CLIENT_SUBSCRIPTION`) — si la licence est facturable côté client.
3. **Module activé** (`CLIENT_MODULE_ENABLED`) — module global + activation client.
4. **Visibilité module** (`USER_MODULE_VISIBLE`) — masquage profil (admin studio).
5. **RBAC** (`RBAC_PERMISSION`) — codes issus du registre `RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY` (alignés seed) ; `permissionCodes` de `GET /api/me/permissions` est la **seule** source d’autorité pour l’UI.
6. **ACL ressource** (`RESOURCE_ACL`) — si la ressource est en mode restreint (au moins une entrée `ResourceAcl`).

### ACL ressource et administration

- Liste et édition des entrées ACL : routes `GET|PUT|POST|DELETE` sous `/api/resource-acl/...` (voir `docs/API.md`).
- **GET** liste ACL : uniquement **CLIENT_ADMIN** avec **ClientUser ACTIVE** (stack historique).
- **Mutations** : **CLIENT_ADMIN** **ou** **PLATFORM_ADMIN** avec `X-Client-Id` valide (Option A RFC-ACL-014), query `force=true` réservée plateforme pour bypass lockout documenté.

### Lockout « dernier ADMIN effectif »

Si, après une mutation simulée, la ressource reste **restreinte** mais **aucun** successeur ne passe les six contrôles avec niveau ACL **ADMIN** et RBAC d’intention **ADMIN** (fallback WRITE documenté pour BUDGET / SUPPLIER quand pas de permission fine), la mutation est refusée (**409** `RESOURCE_ACL_LAST_ADMIN_LOCKOUT`) sauf `force=true` par **PLATFORM_ADMIN**.

### Diagnostic self-service

`GET /api/access-diagnostics/effective-rights/me` : voir `docs/API.md` — `ALLOWED` / `DENIED` / `UNSAFE_CONTEXT`, `DIAGNOSTIC_UNSAFE_CONTEXT` pour les cas où le diagnostic ne doit pas fuiter d’existence de ressource hors périmètre.

### Rôles informatifs

`GET /api/me/permissions` inclut `roles[]` **sans** effet sur les droits UI : affichage / traçabilité uniquement.

## Modèle cible (RFC-ORG-001 et périmètres futurs)

Le socle **OrgUnit** / **OrgGroup** / rattachements ressource **HUMAN** peut vivre en admin sans être injecté dans le moteur ci-dessus tant qu’il n’est pas branché dans l’autorisation.

Les notions **`read_scope`**, **`write_scope`**, **`manage_acl_scope`** et toute couche « Direction » comme **contrôle d’accès opérationnel** sont **hors moteur** tant que non implémentées explicitement.

## Hors périmètre RFC-ACL-014

- Pas de migration Prisma dédiée.
- Pas de champs `ownerDirectionId` / `ownerUserId` sur les entités métier dans cette RFC.
- Pas de permission `acl.manage` inventée : la gestion ACL reste portée par les guards mutations + RBAC existant.
