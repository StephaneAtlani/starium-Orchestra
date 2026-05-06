# RFC-ACL-004 — Visibilité des modules

## Statut

✅ **Implémentée (MVP)** — backend (Prisma, services, guards), API admin client, `GET /me/permissions` enrichi, filtrage navigation web, page `/client/administration/module-visibility`, tests unitaires ciblés.

## 1. Analyse de l’existant

L’activation module par client existe côté plateforme, mais il manquait une couche de masquage fin côté client (client entier, groupe, utilisateur) sans désactiver globalement le module.

## 2. Hypothèses / décisions tranchées

- Le module doit d’abord être **activé** côté plateforme pour être potentiellement visible.
- Ordre d’évaluation des overrides : **`USER` > `GROUP` > `CLIENT`** ; côté **plusieurs lignes GROUP** pour le même module, si au moins un groupe impose **`VISIBLE`**, ce **`VISIBLE` l’emporte** sur un `HIDDEN` d’un autre groupe ; sinon premier `HIDDEN` / `VISIBLE` cohérent avec la liste (voir tests `ModuleVisibilityService`).
- **Pas de `APP_GUARD` dédié** : la visibilité est appliquée dans **`ModuleAccessGuard`** (activation client + module visible + RBAC effectif via **`EffectivePermissionsService`**, partagé avec **`PermissionsGuard`**) pour éviter tout contournement (dont `RequireAnyPermissions`).
- Le frontend **filtre la navigation** selon `visibleModuleCodes` renvoyés par l’API ; la **source de vérité** reste le backend.

## 3. Liste des fichiers (réalisés / points d’extension)

- `apps/api/prisma/schema.prisma` — enums `ModuleVisibilityScopeType`, `ModuleVisibilityState`, modèle `ClientModuleVisibility`, relation `Client`.
- `apps/api/prisma/migrations/20260507140000_acl_004_module_visibility/migration.sql` — table, contraintes `scopeId` selon scope, index uniques partiels.
- `apps/api/src/modules/module-visibility/` — service, controller, DTOs, module Nest (`ModuleVisibilityModule` importé par `CommonModule`, service exporté pour `MeModule` / guards).
- `apps/api/src/common/services/effective-permissions.service.ts` — résolution centralisée des codes permission (cache `request.resolvedPermissionCodes`).
- `apps/api/src/common/guards/module-access.guard.ts` — RBAC + activation module client + visibilité.
- `apps/api/src/common/guards/permissions.guard.ts` — délégation résolution permissions à `EffectivePermissionsService`.
- `apps/api/src/common/common.module.ts` — `@Global()`, import `ModuleVisibilityModule`, providers exports.
- `apps/api/src/modules/me/` — `visibleModuleCodes` sur `GET /me/permissions`.
- `apps/web/src/services/me.ts`, `apps/web/src/hooks/use-permissions.ts` — `isModuleVisible`, rétrocompat si champ absent.
- `apps/web/src/components/shell/navigation-visibility.ts`, `sidebar.tsx` — filtre nav.
- `apps/web/src/features/module-visibility/` — API, hooks, page admin matrice / overrides.
- `apps/web/src/app/(protected)/client/administration/module-visibility/page.tsx` + lien depuis `administration/page.tsx`.

*(Référence historique RFC : un guard nommé `ModuleVisibilityGuard` dans le pipeline global **n’a pas été retenu** ; comportement équivalent dans `ModuleAccessGuard`.)*

## 4. API

Préfixe global : `/api`. Contexte **client actif** (`ActiveClientGuard`) + **CLIENT_ADMIN** pour l’admin visibilité.

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/module-visibility` | Matrice modules + overrides pour le client actif. |
| `PATCH` | `/api/module-visibility` | Créer / mettre à jour un override (`moduleCode`, `scopeType`, `scopeId?`, `visibility`). |
| `DELETE` | `/api/module-visibility` | Supprimer un override (query : `moduleCode`, `scopeType`, `scopeId?`). |

`GET /me/permissions` : réponse enrichie avec **`visibleModuleCodes: string[]`** (modules visibles pour l’utilisateur dans le client actif, intersectés avec l’activation plateforme côté guard d’accès).

## 5. Modifications Prisma

- `ModuleVisibilityScopeType` : `CLIENT`, `GROUP`, `USER`
- `ModuleVisibilityState` : `VISIBLE`, `HIDDEN`
- `ClientModuleVisibility` : `clientId`, `moduleCode`, `scopeType`, `scopeId` (nullable si `CLIENT`), `visibility`, timestamps ; contrainte DB : `CLIENT` ⇒ `scopeId` NULL ; `GROUP` / `USER` ⇒ `scopeId` NOT NULL ; index uniques partiels par `(clientId, moduleCode, scopeType, scopeId)`.

## 6. Tests

- Service : priorité USER / GROUP (VISIBLE gagnant) / CLIENT, cross-client, mutations Prisma.
- `ModuleAccessGuard` : refus si module non activé ou non visible ; `RequireAnyPermissions` avec alternatives multi-modules.
- `PermissionsGuard` : alignement reflector / multi-modules.
- Frontend : `navigation-visibility.spec.ts` (entrées masquées si module non visible).

## 7. Récapitulatif final

Couche de visibilité interne par client / groupe / utilisateur, **complémentaire** à l’activation plateforme, alignée sur le principe **accès réel = intersection** (licence / module / RBAC / visibilité — autres couches ACL à suivre dans RFC-ACL-005+).

## 8. Points de vigilance

- Respect strict de l’ordre de priorité et de la règle **VISIBLE groupe** vs **HIDDEN** multi-groupes.
- Ne pas dupliquer la logique de résolution dans le frontend.
- Auditer toute modification de visibilité (événements dédiés côté service).
