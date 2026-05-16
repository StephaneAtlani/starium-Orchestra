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

- Les codes `*.read_own`, `*.read_scope`, `*.read_all`, `*.write_scope`, `*.manage_all` sont **seedés** pour les modules concernés. **`OrganizationScopeService` (RFC-016)** résout le périmètre org ; **`AccessDecisionService` (RFC-018)** orchestre licence → module → RBAC intent → org → matrice policy/ACL (**RFC-017**) pour les chemins **branchés** ([RFC-ACL-020](RFC/RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md)) : Projets, Budgets (+ lignes), Contrats, Fournisseurs, objectifs stratégiques — intents `read` / `write` / `admin` / `list` ; activation **par client** via `ACCESS_DECISION_V2_*` ([RFC-ACL-022](RFC/RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md), [runbook](runbooks/migration-org-scope-access.md)) ; fallback legacy si flag off.
- **Guards HTTP (RFC-ACL-024)** : `@RequireAccessIntent` + registre `SERVICE_ENFORCED_REGISTRY` (`Controller.method`). Un `read_scope` / `write_scope` ne passe le guard que si **flag V2 module actif** **et** route/service migrés (guard ≤ service). Routes non migrées : legacy strict (`read_all` → `*.read` via `satisfiesPermission` uniquement). `create` : legacy `*.create` / `manage_all` — pas de `write_scope` en V1.
- **`GET /api/me/permissions`** : champ informatif `accessDecisionV2` (flags du **client actif** uniquement) ; l’UI utilise `evaluateAccessIntentForUi` (`@starium-orchestra/rbac-permissions`).
- **Diagnostics** : `seededNotEnforced` si scoped sans legacy et V2 off ; `seededButRouteNotMigrated` si V2 on mais route pas encore alignée sur le registre service-enforced.

| Module | Flag client | Exemples handlers migrés V1 |
| --- | --- | --- |
| projects | `ACCESS_DECISION_V2_PROJECTS` | `ProjectsController.list`, `getById`, `update`, `remove` |
| budgets | `ACCESS_DECISION_V2_BUDGETS` | `BudgetsController.list`, `getById`, `update` ; `BudgetLinesController.*` |
| contracts | `ACCESS_DECISION_V2_CONTRACTS` | `ContractsController.list`, `getOne`, `update`, `remove` |
| procurement | `ACCESS_DECISION_V2_PROCUREMENT` | `SuppliersController.list`, `getById`, `update` |
| strategic_vision | `ACCESS_DECISION_V2_STRATEGIC_VISION` | `StrategicVisionController.listObjectives`, `getObjectiveNested`, `updateObjective`, … |

## Modèle cible (RFC-ORG-001 et périmètres futurs)

Le socle **OrgUnit** / **OrgGroup** / rattachements ressource **HUMAN** peut vivre en admin sans être injecté dans le moteur ci-dessus tant qu’il n’est pas branché dans l’autorisation.

Les notions **`write_scope`** et **`manage_acl_scope`** et la couche « Direction » (`ownerOrgUnitId`) comme **contrôle d’accès opérationnel** s’appliquent sur les modules branchés **020** lorsque le flag client correspondant est activé (après backfill **022**).

## RFC-ORG-004 — steward, transfert massif, obligation ownership

- **`stewardResourceId`** (Resource HUMAN, même client) sur Project, Budget, BudgetLine, Supplier, SupplierContract, StrategicObjective — réponse API **`stewardSummary`** sur **Projet** (libellé humain) ; autres modules : colonne Prisma, pas encore `stewardSummary` en API V1.
- **Transfert** : `POST /api/organization/ownership-transfers` — `resourceTypes` canoniques `PROJECT` | `BUDGET` | `BUDGET_LINE` | `SUPPLIER` | `CONTRACT` | `STRATEGIC_OBJECTIVE` ; `dryRun: true` = preview sans écriture ni audit ; apply = `dryRun: false` + `confirmApply: true` ; `BudgetLine` = overrides stockés uniquement (`ownerOrgUnitId` colonne ligne).
- **Politique client** : `GET|PATCH /api/organization/ownership-policy` → `{ mode, enforcementEnabled, flagKey: 'ORG_OWNERSHIP_REQUIRED' }` ; `enforcementEnabled` = mode `REQUIRED_ON_*` **et** flag ops actif (pas d’API flags globale V1).
- **BudgetLine obligation** : owner effectif = `line.ownerOrgUnitId ?? budget.ownerOrgUnitId` (héritage budget accepté).
- Permission dédiée : `organization.ownership.transfer` ; steward modifiable via `*.update` module.

## Cockpit admin santé du modèle (RFC-ACL-021)

Pour les **CLIENT_ADMIN** disposant de `access_model.read` :

- **UI** : `/client/administration/access-model` (distinct de `/client/administration/access-cockpit` RFC-ACL-010).
- **API** : `GET /api/access-model/health` (KPI + état des flags `ACCESS_DECISION_V2_*` pour ce cockpit uniquement) et `GET /api/access-model/issues` (alertes paginées par catégorie).
- Complète le diagnostic ponctuel [RFC-ACL-011](./RFC/RFC-ACL-011%20%E2%80%94%20Matrice%20des%20droits%20effectifs.md) / [RFC-ACL-019](./RFC-ACL-019%20%E2%80%94%20Diagnostic%20enrichi%20organisation%20et%20acc%C3%A8s.md) par une **vue transverse** (ressources sans Direction effective, membres sans fiche HUMAN avec droits scopés, ACL atypiques, politiques à revoir).

Voir `docs/API.md` §5.053 et [RFC-ACL-021](./RFC/RFC-ACL-021%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%27acc%C3%A8s%20admin%20client.md).

## Hors périmètre RFC-ACL-014

- Pas de migration Prisma dédiée.
- Pas de champs `ownerDirectionId` / `ownerUserId` sur les entités métier dans cette RFC.
- Pas de permission `acl.manage` inventée : la gestion ACL reste portée par les guards mutations + RBAC existant.
