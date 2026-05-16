# RFC-ACL-021 — Cockpit « modèle d’accès » (admin client)

## Statut

**Implémentée (V1)** — module `access-model`, API `GET /api/access-model/health` et `GET /api/access-model/issues`, permission `access_model.read`, UI `/client/administration/access-model`. S’appuie sur [RFC-ACL-019](./RFC-ACL-019%20%E2%80%94%20Diagnostic%20enrichi%20organisation%20et%20acc%C3%A8s.md) et [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md). Distinct du cockpit groupes/licences [RFC-ACL-010](./RFC-ACL-010%20%E2%80%94%20UX%20cockpit%20licences%20et%20droits.md) (`/client/administration/access-cockpit`).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P2** |
| **Ordre recommandé** | **10** (après les tranches **020 + 022**, ordre 8–9 du plan) |
| **Dépendances (plan)** | RFC-ACL-019, RFC-ACL-020 |
| **Livrables (plan)** | UI `/client/administration/access-model`, KPI droits, alertes, filtres, actions correctives |

**RFC-ACL-022** précède ce cockpit dans le plan : sans backfill partiel, flags et au moins une intégration métier (020), les KPI peuvent rester vides ou bruités. Le cockpit reste exploitable dès qu’il existe des données organisationnelles / ACL sur le client.

## Objectif

Fournir une **vue d’ensemble** pour les administrateurs client sur la santé du modèle d’accès :

- Ressources métier **sans Direction effective** (`ownerOrgUnitId` null ou héritage budget insuffisant pour les lignes).
- Utilisateurs **sans `Resource` HUMAN** liée ([RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md)) avec au moins une permission scopée (`*.read_scope`, `*.read_own`, `*.write_scope` — pas les legacy `*.read` / `*.update`).
- **Partages ACL** atypiques (entrées `WRITE` / `ADMIN` hors sous-arbre de l’unité propriétaire) — heuristique batch.
- **Conflits potentiels** (`RESTRICTIVE` ou `SHARING` sans entrée ACL — signaux structurels RFC-ACL-017).

Route UI : **`/client/administration/access-model`** (complément de `/client/administration/access-cockpit` et `/client/help/access-model`).

---

## 1. Implémentation (état code)

### Backend — `apps/api/src/modules/access-model/`

| Fichier | Rôle |
| --- | --- |
| `access-model.module.ts` | `PrismaModule`, `AuthModule`, `FeatureFlagsModule` ; enregistré dans `AppModule` |
| `access-model.controller.ts` | `GET /api/access-model/health`, `GET /api/access-model/issues` |
| `access-model.service.ts` | Orchestration KPI + listes paginées |
| `access-model.helpers.ts` | `missing_owner` (owner effectif), `missing_human` (permissions batch), utilitaires pagination |
| `access-model-heuristics.ts` | `atypical_acl`, `policy_review` (batch anti-N+1) |
| `access-model.constants.ts` | Plafonds scan, entrées rollout `FLAG_KEYS` |
| `dto/access-model-issues.query.dto.ts` | `category`, `page`, `limit`, `module`, `search` |

**Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `PermissionsGuard` + `@RequirePermissions('access_model.read')` — **sans** `ModuleAccessGuard` (cockpit admin transverse, même philosophie que `access-diagnostics`).

**Seed** (`apps/api/prisma/seed.ts`) :

- `ensureAccessModelModuleAndPermissions()` — module `access_model` (`isActive: true`), permission `access_model.read`.
- `ensureClientAdminAccessModelRole()` — rôle global « Client admin — modèle d'accès », `UserRole` pour chaque `CLIENT_ADMIN` actif.
- Activation client via `ensureEnabledClientModulesForAllClients()` (fin de seed).

**Package** : `isAccessModelScopedPermission()` dans `@starium-orchestra/rbac-permissions` (catalogue RFC-ACL-015).

### API

- **`GET /api/access-model/health`** — KPI + `rollout[]` (lecture `ClientFeatureFlag` / env pour `ACCESS_DECISION_V2_*` **uniquement ici** ; pas d’endpoint `/api/me/feature-flags`).
- **`GET /api/access-model/issues?category=...&page=&limit=&module=&search=`** — catégories : `missing_owner` \| `missing_human` \| `atypical_acl` \| `policy_review` ; réponse paginée avec `truncated` si plafond scan.

**Règles métier V1** :

- **`missing_owner`** : owner effectif ; `BudgetLine` = `BudgetLine.ownerOrgUnitId ?? Budget.ownerOrgUnitId` ; pas d’issue si le budget parent a une Direction.
- **`missing_human`** : `ClientUser` ACTIVE sans `resourceId` ; permissions filtrées comme `/me/permissions` (rôles `CLIENT` du client + `GLOBAL`, modules `ENABLED` uniquement) ; helper `isAccessModelScopedPermission`.
- **`atypical_acl`** : un `ResourceAcl.findMany` + chargements groupés (users, groupes, memberships, arbre `OrgUnit`) — pas de boucle Prisma par ACL.
- **`policy_review`** : `RESTRICTIVE` + zéro ACL ; ou `SHARING` + zéro ACL + owner effectif défini.

Types canoniques : `SupportedDiagnosticResourceType`, `RESOURCE_ACL_RESOURCE_TYPES`, `FLAG_KEYS` (pas de strings libres).

### Frontend — `apps/web/src/features/access-model/`

- Page : `apps/web/src/app/(protected)/client/administration/access-model/page.tsx`.
- KPI cliquables, bandeau rollout (données `health` uniquement), table alertes avec libellés métier et liens correctifs.
- Carte admin (`AccessModelAdminCard`) et entrée navigation si `access_model.read` ; raccourci depuis le cockpit accès RFC-ACL-010.
- Lien depuis `/client/help/access-model` vers le cockpit.

### Tests

- API : `access-model.service.spec.ts`, `access-model.controller.spec.ts` (BudgetLine owner effectif, scoped permissions, batch ACL, guards).
- Web : `access-model.api.spec.ts` ; `access-cockpit/lib/shortcuts.spec.ts` (route access-model).

---

## 2. Hypothèses (inchangées)

- KPI calculés **côté serveur** avec pagination ; plafond scan par catégorie (`truncated: true` si dépassement).
- Listes : **nom / titre** métier, jamais UUID seul en colonne principale.

---

## 3. Hors périmètre

- Correction automatique en masse (assist + deep-links uniquement).
- Export CSV dédié → [RFC-ACL-026](./RFC-ACL-026%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%20acc%C3%A8s%20V2.md).
- Variante plateforme / endpoint global feature-flags.
- Hook React global `useFeatureFlags` (V1 : `rollout` dans `health` seulement).

---

## 4. Points de vigilance

- Ne pas confondre avec **RFC-ACL-010** (`access-cockpit`).
- Coût des agrégations : plafonds documentés dans le service ; cache TTL optionnel non activé en V1.
- Filtrer les permissions `missing_human` par **client actif** (pas de rôles d’un autre client ni legacy seuls).
