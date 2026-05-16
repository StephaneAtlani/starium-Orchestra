# RFC-ACL-015 — Permissions `OWN` / `SCOPE` / `ALL`

## Statut

**🟡 Partielle (socle livré)** — vocabulaire seedé, règles de satisfaction **restrictives** avant [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) / [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md), API `/me/permissions` (bruts + hints UI), diagnostics ; **généralisation guards HTTP (V1)** : [RFC-ACL-024](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) (`@RequireAccessIntent`, registre handlers, `accessDecisionV2` sur `/me/permissions`) — résolution `OWN`/`SCOPE` sur **ressources** = 016/018/020 ; satellites contrôleurs hors V1. Étend le RBAC existant sans remplacer [RFC-ACL-005](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) (ACL par ressource `READ|WRITE|ADMIN`).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **3** (après ORG-002 et ORG-003) |
| **Dépendances (plan)** | RBAC existant (seeds, profils, `EffectivePermissionsService`) |
| **Livrables (plan)** | Permissions seedées, compatibilité guards documentée, tests, doc — **profils** : conservation des codes **legacy** sur les routes non filtrées (pas de bascule massive `read_scope` seul) jusqu’au moteur 016/018 |

Les codes doivent être **figés avant** le durcissement enforcement dans [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) / [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md).

## Objectif

Introduire une **granularité de périmètre** dans les capacités RBAC, exprimée par des **suffixes ou codes** normalisés :

| Périmètre | Signification métier (liste / détail) |
| --- | --- |
| **OWN** | Uniquement les enregistrements où l’utilisateur est acteur direct (ex. assigné, créateur, ou ressource HUMAN « soi » selon règle module). |
| **SCOPE** | Enregistrements dont la **propriété organisationnelle** (RFC-ORG-003) ou l’appartenance **OrgUnit** de l’utilisateur (RFC-ACL-016) tombe dans le sous-périmètre autorisé. |
| **ALL** | Tout le client (sous réserve licence module + ACL ressource éventuelle). |

Exemples de codes **figés en dépôt** (registre + seed : package `@starium-orchestra/rbac-permissions`, `getScopedPermissionSeedRows()`) pour les modules : `budgets`, `projects`, `contracts`, `procurement`, `strategic_vision` — pour chacun : `read_own`, `read_scope`, `read_all`, `write_scope`, `manage_all`. D’autres modules (ex. `documents`, `suppliers`) restent **hors** ce lot seed « scoped » tant qu’ils ne sont pas ajoutés au catalogue partagé.

Les permissions **sans** suffixe existantes restent la référence sur les routes legacy : compatibilité **guard** explicite — `*.read_all` peut satisfaire `*.read` (même intention « tout le client ») ; `read_scope` / `read_own` **ne** satisfont **pas** `*.read` tant que le filtrage n’est pas branché ; `write_scope` ne satisfait pas `*.update` legacy global ; `manage_all` → `*.delete` **uniquement** pour les paires catalogue (ex. `projects`, `contracts`).

---

## 1. Analyse de l’existant

- Seeds profils / rôles (`default-profiles.json`, tables `Permission` / liaisons rôle-permission selon implémentation réelle).
- `EffectivePermissionsService` + guards Nest : union brute des codes ; vérification via **`satisfiesPermission`** (package partagé), pas de `Set.has(codeRequis)` isolé sur les chemins d’autorisation.
- **SCOPE** organisationnel effectif sur les listes / mutations métier : **non** — à livrer avec RFC-ACL-016 / RFC-ACL-018.

---

## 2. Hypothèses

- Les codes sont des **strings stables** côté API ; le front affiche des **libellés FR** issus d’un dictionnaire.
- **`ALL` implicite pour `CLIENT_ADMIN`** reste une règle produit possible, mais doit être **codée explicitement** dans le moteur (RFC-ACL-018) pour éviter les divergences module par module.
- **`PLATFORM_ADMIN`** hors scope client : inchangé ; pas de `SCOPE` inter-clients.

---

## 3. Fichiers / emplacements (réalité dépôt)

- **`packages/rbac-permissions/`** : `satisfiesPermission`, `satisfiesAnyPermission`, `expandForUi`, `expandForLegacyGuards`, `uiPermissionHintsArray`, `getScopedPermissionSeedRows`, listes `SCOPED_READ_MODULES` / `MANAGE_ALL_IMPLIES_DELETE_MODULES`, tests Vitest.
- **`apps/api/prisma/seed.ts`** : `ensureBudgetsProjectsProcurementModuleAndPermissions`, `ensureScopedPermissionsFromCatalog` (avant `ensureDefaultGlobalProfiles`).
- **`apps/api/src/common/guards/`** : `permissions.guard.ts`, `module-access.guard.ts` — appels package uniquement.
- **`apps/api/src/common/services/effective-permissions.service.ts`** : union **brute** des codes rôle → permission (cache requête) ; pas d’injection des hints UI dans ce set.
- **`apps/api/src/modules/me/`** : `GET /me/permissions` — `permissionCodes` bruts + `uiPermissionHints`.
- **`apps/api/src/modules/access-diagnostics/`** : RBAC via `satisfiesPermission` ; détail `seededNotEnforced` quand scoped lecture sans legacy `*.read`.
- **`apps/web`** : types `MePermissionsResponse`, hook `use-permissions` (`has` = même sémantique que l’API), `transpilePackages` pour le package RBAC.
- **Documentation** : [ACCESS-MODEL.md](../ACCESS-MODEL.md), [API.md](../API.md) § `/me/permissions`.

---

## 4. Hors périmètre

- Implémentation du calcul de sous-arbre `OrgUnit` (RFC-ACL-016).
- Politique `ResourceAccessPolicy` (RFC-ACL-017).
- UI cockpit RFC-ACL-021.

---

## 5. Tests

- **Package** : `packages/rbac-permissions/src/index.spec.ts` — matrice `read_scope` / `read_own` **ne** satisfont **pas** `*.read` legacy ; `read_all` satisfait `*.read` pour les modules catalogue ; `expandForUi` n’élargit pas les guards.
- **API** : specs guards (`permissions.guard`, `module-access.guard`), `me.service`, `access-diagnostics.service`, recherche — cohérence avec `satisfiesPermission`.
- Aucune permission ne cible un autre `clientId`.

---

## 6. Récapitulatif

RFC-ACL-015 fournit le **vocabulaire** RBAC ; RFC-ACL-016 et RFC-ACL-018 donnent la **sémantique** et l’**enforcement** sur les ressources (via 020 + flags 022). **État dépôt** : le **socle** est livré ; l’**enforcement guards HTTP V1** est livré par [RFC-ACL-024](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) (vague 1 controllers + registre `SERVICE_ENFORCED_REGISTRY`).

---

## 7. Points de vigilance

- Explosion combinatoire : limiter aux **actions** réellement distinctes (read vs write vs manage) ; éviter `write_own` si non pertinent.
- Cohérence avec **ACL ressource** : RBAC `read_all` n’outrepasse pas une ACL `RESTRICTIVE` sans entrée (RFC-ACL-017).
