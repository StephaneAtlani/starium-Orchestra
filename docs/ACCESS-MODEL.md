# Modèle d’accès (RFC-ACL-014)

Ce document complète la section **§11** de `docs/API.md` avec une vue produit : **ce qui est en production** vs **la cible organisationnelle** (RFC-ORG-001).

## Modèle opérationnel actuel

### Sept contrôles canoniques

Pour une intention donnée (`READ`, `WRITE`, `ADMIN`), l’évaluation effective combine jusqu’à :

1. **Licence utilisateur** (`USER_LICENSE`) — statut membre, type READ_ONLY / READ_WRITE, dates.
2. **Abonnement client** (`CLIENT_SUBSCRIPTION`) — si la licence est facturable côté client.
3. **Module activé** (`CLIENT_MODULE_ENABLED`) — module global + activation client.
4. **Visibilité module** (`USER_MODULE_VISIBLE`) — masquage profil (admin studio).
5. **RBAC** (`RBAC_PERMISSION`) — codes seedés + package `@starium-orchestra/rbac-permissions` ; contrôle via **`satisfiesPermission`** (guards, diagnostics RBAC, recherche) — pas de `Set.has(codeRequis)` isolé.
6. **`GET /api/me/permissions`** : `permissionCodes` = codes **bruts** (alignés guards) ; `uiPermissionHints` = implications d’affichage uniquement (RFC-ACL-015). L’UI aligne masquage / actions sur `has()` = `satisfiesPermission(bruts, code)`.
7. **ACL ressource** (`RESOURCE_ACL`) — couche **ResourceAcl** + politique **`ResourceAccessPolicy`** (RFC-ACL-017 : modes `DEFAULT` / `RESTRICTIVE` / `SHARING`) ; le champ API historique **`restricted`** reste « au moins une entrée ACL » ; l’effet réel pour l’UI combine **`accessPolicy`** et **`effectiveAccessMode`** (voir RFC-ACL-017 et `docs/API.md` §5.0).

### ACL ressource et administration

- Liste, politique et édition des entrées ACL : routes `GET`, `PATCH …/access-policy`, `PUT|POST|DELETE` sous `/api/resource-acl/...` (voir `docs/API.md`).
- **GET** liste ACL : uniquement **CLIENT_ADMIN** avec **ClientUser ACTIVE** (stack historique).
- **Mutations** : **CLIENT_ADMIN** **ou** **PLATFORM_ADMIN** avec `X-Client-Id` valide (Option A RFC-ACL-014), query `force=true` réservée plateforme pour bypass lockout documenté.

### Lockout « dernier ADMIN effectif »

Si, après une mutation simulée, la ressource reste **restreinte** mais **aucun** successeur ne passe les six contrôles avec niveau ACL **ADMIN** et RBAC d’intention **ADMIN** (fallback WRITE documenté pour BUDGET / SUPPLIER quand pas de permission fine), la mutation est refusée (**409** `RESOURCE_ACL_LAST_ADMIN_LOCKOUT`) sauf `force=true` par **PLATFORM_ADMIN**.

### Diagnostic self-service

`GET /api/access-diagnostics/effective-rights/me` : voir `docs/API.md` §5.051 — `ALLOWED` / `DENIED` / `UNSAFE_CONTEXT`, `DIAGNOSTIC_UNSAFE_CONTEXT` pour les cas où le diagnostic ne doit pas fuiter d’existence de ressource hors périmètre.

Avec **`ACCESS_DIAGNOSTICS_ENRICHED`** = `true` ou `1` au sens strict (voir `docs/API.md` §5.05), la réponse peut inclure trois contrôles supplémentaires entre RBAC et ACL — **`ORGANIZATION_SCOPE`**, **`RESOURCE_OWNERSHIP`**, **`RESOURCE_ACCESS_POLICY`** — et harmoniser l’intention **READ** avec le moteur [RFC-ACL-018](./RFC/RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md) ([RFC-ACL-019](./RFC/RFC-ACL-019%20%E2%80%94%20Diagnostic%20enrichi%20organisation%20et%20acc%C3%A8s.md)).

### Rôles informatifs

`GET /api/me/permissions` inclut `roles[]` **sans** effet sur les droits effectifs : affichage / traçabilité uniquement.

## RFC-ACL-015 — vocabulaire OWN / SCOPE / ALL (RFC-016 + RFC-018)

- Les codes `*.read_own`, `*.read_scope`, `*.read_all`, `*.write_scope`, `*.manage_all` sont **seedés** pour les modules concernés. **`OrganizationScopeService` (RFC-016)** résout le périmètre org ; **`AccessDecisionService` (RFC-018)** orchestre licence → module → RBAC intent → org → matrice policy/ACL (**RFC-017**) pour les chemins **branchés** (V1 : **lecture** et **liste** Projets côté `ProjectsService` ; autres modules et intents `write`/`admin` sur le moteur = portages ultérieurs).
- **Guards HTTP** : `ModuleAccessGuard` / `PermissionsGuard` restent la porte d’entrée sur les contrôleurs ; le moteur 018 renforce la **cohérence service** (détail vs liste) et impose `sharingFloorAllows = floorAllowed` vers `AccessControlService`. Tant qu’une route n’est pas couverte par 018, seuls `*.read_all` (équivalent **global client** au legacy `*.read`) et les paires documentées `*.manage_all` → `*.delete` (ex. `projects`, `contracts`) élargissent la satisfaction d’un décorateur legacy ; `read_scope` / `read_own` **ne** valident **pas** un `@RequirePermissions('*.read')` sur routes non filtrées.
- **Diagnostics** : en cas de refus RBAC alors que l’utilisateur détient `read_scope` / `read_own` sans legacy `*.read`, la réponse peut inclure `details.seededNotEnforced` — le vocabulaire existe mais **aucun** accès lecture legacy ne doit être inféré.

## Modèle cible (RFC-ORG-001 et périmètres futurs)

Le socle **OrgUnit** / **OrgGroup** / rattachements ressource **HUMAN** peut vivre en admin sans être injecté dans le moteur ci-dessus tant qu’il n’est pas branché dans l’autorisation.

Les notions **`write_scope`** et **`manage_acl_scope`** et toute couche « Direction » comme **contrôle d’accès opérationnel** complètent le vocabulaire RFC-ACL-015 une fois RFC-016 / RFC-018 étendus aux écritures et aux autres modules (RFC-020).

## Hors périmètre RFC-ACL-014

- Pas de migration Prisma dédiée.
- Pas de champs `ownerDirectionId` / `ownerUserId` sur les entités métier dans cette RFC.
- Pas de permission `acl.manage` inventée : la gestion ACL reste portée par les guards mutations + RBAC existant.
