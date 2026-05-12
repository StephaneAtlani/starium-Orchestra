# RFC-ACL-014 — Conformité modèle Rôles, Groupes et ACL

## Statut

**Implémentée (V1)** — Registre diagnostic RBAC par intention, garde-fou serveur **last ADMIN lockout** sur mutations ACL, **Option A** (`PLATFORM_ADMIN` + `X-Client-Id` valide sur **PUT/POST/DELETE** uniquement), diagnostic self-service **`GET /api/access-diagnostics/effective-rights/me`**, enrichissement **`GET /api/me/permissions`** (`roles[]` informatif), UI **« Accès à la ressource »** + composant **`AccessExplainerPopover`** (lazy) + page d’aide **`/client/help/access-model`** + **`docs/ACCESS-MODEL.md`**. Aucune migration Prisma dans cette RFC ; pas de `ownerDirectionId` / `ownerUserId` ; org RFC-ORG-001 **non** branchée dans le moteur d’accès.

## 1. Analyse de l’existant

- [RFC-ACL-005](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) : CRUD ACL ; garde **CLIENT_ADMIN** sur toutes les routes historiques.
- [RFC-ACL-011](./RFC-ACL-011%20%E2%80%94%20Matrice%20des%20droits%20effectifs.md) : diagnostic **admin** `GET /api/access-diagnostics/effective-rights` (query `userId` + `operation`).
- [RFC-ACL-013](./RFC-ACL-013%20%E2%80%94%20%C3%89diteur%20ACL%20par%20ressource.md) : éditeur UI ; bouton libellé « Permissions ».

## 2. Hypothèses retenues

- **Six contrôles** alignés diagnostic + lockout : licence, abonnement (si applicable), module activé, visibilité module, RBAC (codes registre), ACL ressource.
- **`ADMIN` RBAC** : pas de permission `acl.manage` ; fallback documenté (ex. BUDGET / SUPPLIER → permissions `WRITE` pour l’intention ADMIN au diagnostic).
- **Anti-fuite** : `UNSAFE_CONTEXT` + `DIAGNOSTIC_UNSAFE_CONTEXT` uniquement quand le diagnostic ne peut pas être exposé sans risque ; refus explicites sur ressource **dans** le client ⇒ `DENIED`.

## 3. Liste des fichiers créés / modifiés (principaux)

### Backend

- `apps/api/src/common/guards/active-client-or-platform-context.guard.ts`
- `apps/api/src/common/guards/client-admin-or-platform-admin.guard.ts`
- `apps/api/src/common/types/request-with-client.ts` (`platformResolvedOnly` optionnel)
- `apps/api/src/modules/access-control/resource-acl.controller.ts` (guards différenciés GET vs mutations ; query `force`)
- `apps/api/src/modules/access-control/access-control.service.ts` (lockout, `force`, audits, ACL simulée)
- `apps/api/src/modules/access-control/access-control.module.ts` (`forwardRef` diagnostics)
- `apps/api/src/modules/access-diagnostics/resource-access-diagnostic.registry.ts` + `.spec.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics-self.controller.ts` + `.spec.ts`
- `apps/api/src/modules/access-diagnostics/dto/my-effective-rights-query.dto.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics.service.ts` (`computeMyEffectiveRights`, `hasEffectiveAdminSuccessorAfterSimulation`, overrides RBAC/ACL simulée)
- `apps/api/src/modules/access-diagnostics/access-diagnostics.types.ts` (`MyEffectiveRightsResponse`, etc.)
- `apps/api/src/modules/access-diagnostics/access-diagnostics.module.ts`
- `apps/api/src/modules/me/me.service.ts`, `me.controller.ts`

### Frontend

- `apps/web/src/services/access-diagnostics.ts` — `getMyEffectiveRights`
- `apps/web/src/features/access-diagnostics/components/access-explainer-popover.tsx` + `.spec.tsx`
- `apps/web/src/features/resource-acl/components/resource-acl-trigger-button.tsx`, `resource-acl-dialog.tsx`
- Intégrations fiches métier : `project-detail-view.tsx`, `contract-detail-page.tsx`, `budgets/[budgetId]/page.tsx`, `strategic-objective-card.tsx`, `supplier-visualization-modal.tsx`
- `apps/web/src/app/(protected)/client/help/access-model/page.tsx`
- `apps/web/src/services/me.ts`, `hooks/use-permissions.ts`
- `apps/web/src/app/(protected)/projects/page.tsx` (lien aide sur bloc 403)

### Documentation

- `docs/ACCESS-MODEL.md`
- `docs/API.md` (§5 guards, `effective-rights/me`, `roles[]`, `force`, lockout)

## 4. Implémentation (résumé comportement)

| Sujet | Comportement |
|--------|----------------|
| Mutations `PUT` / `POST` / `DELETE` `/api/resource-acl/...` | `ActiveClientOrPlatformContextGuard` + `ClientAdminOrPlatformAdminGuard` ; `force=true` réservé `PLATFORM_ADMIN` |
| `GET` liste ACL | Inchangé : `ActiveClientGuard` + `ClientAdminGuard` |
| Lockout | `409` + `RESOURCE_ACL_LAST_ADMIN_LOCKOUT` + audit `resource_acl.lockout_blocked` si aucun successeur ADMIN effectif ; bypass + audit `resource_acl.force_used` |
| `force` interdit | `403` + `RESOURCE_ACL_FORCE_FORBIDDEN` + `resource_acl.force_denied` |
| `GET .../effective-rights/me` | `intent` = `READ` \| `WRITE` \| `ADMIN` ; réponse `ALLOWED` / `DENIED` / `UNSAFE_CONTEXT` ; audit `access_diagnostic.self_outcome` (hors `ALLOWED` nominal) |
| `GET /api/me/permissions` | + `roles[]` (id, name, code nullable, scope, clientId) — **informatif** |

## 5. Modifications Prisma

- Aucune dans le périmètre RFC-ACL-014.

## 6. Tests

- Registre `RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY` (cohérence types / fallback ADMIN).
- `AccessDiagnosticsSelfController` (guards, pas de `userId` query).
- `AccessControlService` (lockout, `removeEntry` / `replaceEntries` / `addEntry`, mocks diagnostics).
- Vitest : `AccessExplainerPopover`, `ResourceAclTriggerButton`.

## 7. Récapitulatif final

Le produit expose un modèle d’accès **documenté** (`ACCESS-MODEL.md`), des **API** stables (`API.md`), un **diagnostic self-service** pour les membres client, et des **garde-fous serveur** sur les mutations ACL cohérents avec le diagnostic admin (RFC-ACL-011).

## 8. Points de vigilance

- Ne pas étendre les guards **Option A** aux routes métier hors `resource-acl` mutations.
- Ne pas utiliser `roles[]` comme source d’autorité UI.
- Garder `GET` liste ACL strict **CLIENT_ADMIN** tant qu’aucune décision produit n’ouvre aux `PLATFORM_ADMIN`.
- Conserver l’alignement **registre §1** ↔ seed permissions (pas de code inventé).
