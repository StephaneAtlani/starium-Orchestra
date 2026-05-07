# RFC-ACL-010 — UX cockpit licences et droits

## Statut

✅ Implémentée (V1)

## 1. Analyse de l’existant

La lisibilité du modèle droits/licences est un facteur d’adoption critique. Sans cockpit clair, les admins comprennent mal les statuts, quotas et blocages d’accès.

## 2. Hypothèses éventuelles

- Les données cockpit proviennent des endpoints RFC-ACL-001/002/007.
- Le cockpit est orienté décision admin, pas édition low-level.
- Les libellés métier sont obligatoires sur tout composant visuel.
- Aucune nouvelle migration Prisma ; on étend la shape `UserResponse` existante.
- Les pages CRUD RFC-ACL-007 restent en place ; les cockpits sont **additionnels**.

## 3. Liste des fichiers créés / modifiés

### Backend

- `apps/api/src/modules/users/users.service.ts` — `UserResponse` étendu (`licenseStartsAt`, `licenseEndsAt`, `licenseAssignmentReason`) ; `toResponse` sérialise en ISO ; `findAll` propage les nouveaux champs.
- `apps/api/src/modules/users/platform-client-users.controller.ts` *(nouveau)* — `GET /api/platform/clients/:clientId/users` ; protection `JwtAuthGuard` + `PlatformAdminGuard` exclusivement (pas d’`ActiveClientGuard`) ; vérification d’existence du client avant délégation `UsersService.findAll`.
- `apps/api/src/modules/users/users.module.ts` — déclare `PlatformClientUsersController` et provider `PlatformAdminGuard`.
- `apps/api/src/modules/users/platform-client-users.controller.spec.ts` *(nouveau)* — délégation, guards (présence `PlatformAdminGuard`, absence `ActiveClientGuard`), 404 sur client inexistant, shape alignée `GET /api/users`.
- `apps/api/src/modules/users/users.service.spec.ts` — couvre l’exposition des nouveaux champs licence.

### Frontend — feature `licenses-cockpit`

- `apps/web/src/features/licenses-cockpit/api/licenses-cockpit.ts` — type `CockpitMember`, `getPlatformClientUsers` (consomme **uniquement** le nouvel endpoint plateforme).
- `apps/web/src/features/licenses-cockpit/hooks/use-platform-client-users.ts` — hook React Query.
- `apps/web/src/features/licenses-cockpit/lib/license-status.ts` — libellés métier, statut d’expiration, badges, agrégations.
- `apps/web/src/features/licenses-cockpit/lib/license-quick-actions-policy.ts` — `canUseClientLicenseQuickActions`, `canUsePlatformLicenseQuickActions`, **fallback rôle documenté** comme dette technique tant qu’aucune permission API dédiée n’existe sur les routes licences.
- `apps/web/src/features/licenses-cockpit/lib/apply-filters.ts` — application des filtres combinés.
- `apps/web/src/features/licenses-cockpit/components/` — `license-cockpit-kpi-cards`, `license-billing-distribution`, `license-expiration-alerts`, `license-cockpit-filters`, `license-cockpit-table`, `licenses-cockpit-page` (client), `platform-licenses-cockpit-page` (plateforme).
- `apps/web/src/features/licenses-cockpit/query-keys.ts`.
- Tests unitaires : `license-status.spec.ts`, `license-quick-actions-policy.spec.ts`, `apply-filters.spec.ts`, `licenses-cockpit.spec.ts`.

### Frontend — feature `access-cockpit`

- `apps/web/src/features/access-cockpit/lib/aggregate.ts` — calcul des KPI (groupes, overrides, rôles).
- `apps/web/src/features/access-cockpit/lib/shortcuts.ts` — raccourcis canoniques (`/client/administration/access-groups` uniquement).
- `apps/web/src/features/access-cockpit/components/access-cockpit-page.tsx`.
- Tests unitaires : `aggregate.spec.ts`, `shortcuts.spec.ts`.

### Routes Next.js et navigation

- `apps/web/src/app/(protected)/client/administration/licenses-cockpit/page.tsx` *(nouveau)*.
- `apps/web/src/app/(protected)/client/administration/access-cockpit/page.tsx` *(nouveau)*.
- `apps/web/src/app/(protected)/admin/clients/[clientId]/licenses-cockpit/page.tsx` *(nouveau)*.
- `apps/web/src/config/navigation.ts` — items « Cockpit licences » et « Cockpit accès » dans la section ADMINISTRATION (`clientAdminOnly`).
- `apps/web/src/app/(protected)/client/administration/page.tsx` — cartes hub vers les nouveaux cockpits.

### Compatibilité legacy

- `apps/web/src/app/(protected)/client/access-groups/page.tsx` et `/client/access-groups/[id]/page.tsx` — déjà des `redirect()` vers `/client/administration/access-groups` ; aucun lien utilisateur n’est exposé vers ces URL legacy.

## 4. Implémentation

- **Synthèse quotas** : KPI cards consommant `useClientLicenseUsage` (cockpit client) et `usePlatformLicenseUsage` (cockpit plateforme), agrégeant sièges actifs `READ_WRITE + CLIENT_BILLABLE` cumulés des abonnements `ACTIVE`.
- **Distribution** : barres par `(type, mode)` à partir de `aggregateBillingDistribution`.
- **Alertes d’expiration** : `getLicenseExpirationStatus` calcule `expired` / `soon (≤14 j)` / `active` ; tri par `daysRemaining` ascendant.
- **Filtres combinés** : recherche utilisateur (case-insensitive), statut licence, mode, abonnement (libellé `Actif · 5 sièges · début 12/03/2026`, jamais l’ID).
- **Badges métier** : `READ_ONLY illimitée`, `Lecture/Écriture (facturable)`, `Évaluation 30 jours — expire dans X jours`, `Support interne — expirée le …` ; couleur + texte (rouge expirée, ambre soon).
- **Quick-actions** : pilotées par `license-quick-actions-policy.ts`. Tant que les routes licences ne décorent pas de permission fine, fallback rôle (`CLIENT_ADMIN` / `PLATFORM_ADMIN`) **documenté** dans le fichier comme dette technique RFC-ACL-010. Le backend reste source de vérité (`ClientAdminGuard`, `PlatformAdminGuard`).

## 5. Modifications Prisma si nécessaire

- Aucune.

## 6. Tests

### Backend

- `users.service.spec.ts` — `findAll` expose les nouveaux champs licence (ISO).
- `platform-client-users.controller.spec.ts` — délégation `UsersService.findAll`, guards (`PlatformAdminGuard` présent, `ActiveClientGuard` absent), 404 sur client inexistant, shape étendue alignée `GET /api/users`.

### Frontend

- `license-status.spec.ts` — libellés, statut d’expiration (expired / soon / active / none), badges, distribution, comptage expirations.
- `license-quick-actions-policy.spec.ts` — fallback rôle `CLIENT_ADMIN` côté client, `PLATFORM_ADMIN` côté plateforme.
- `apply-filters.spec.ts` — filtres combinés (recherche, mode, abonnement, expirée).
- `licenses-cockpit.spec.ts` — `getPlatformClientUsers` cible **uniquement** `/api/platform/clients/:clientId/users` (jamais `/api/users`), encode le `clientId`, ne fait pas de fallback.
- `access-cockpit/lib/aggregate.spec.ts` — KPI cockpit accès (groupes, overrides, rôles).
- `access-cockpit/lib/shortcuts.spec.ts` — **aucun** lien vers `/client/access-groups`, présence des routes canoniques.

## 7. Récapitulatif final

Cette RFC rend les droits et licences intelligibles pour les admins via deux cockpits opérationnels orientés pilotage et action. Le cockpit licences expose KPI quotas, distribution, expirations, filtres combinés et quick-actions ; le cockpit accès synthétise groupes, visibilité modules et rôles avec raccourcis vers les écrans CRUD existants. Le backend est étendu sans migration Prisma ; un nouvel endpoint plateforme isolé du client actif sert exclusivement le cockpit plateforme.

## 8. Points de vigilance

- **Isolation plateforme** : `GET /platform/clients/:clientId/users` n’utilise **jamais** le client actif ; protection guards stricte vérifiée par test.
- **Aucune permission inventée** : la dette technique (fallback rôle pour quick-actions) est isolée dans `license-quick-actions-policy.ts` avec TODO explicite ; `licensesPermissionDependencies` reste vide.
- **Routes legacy** : `/client/access-groups` n’est qu’un `redirect()` ; aucun lien utilisateur visible n’y mène.
- **Inputs valeur, pas ID** : libellés abonnement reconstitués (`Actif · 5 sièges · début dd/mm/yyyy`) ; aucun `userId`, `subscriptionId` ou `clientId` brut affiché en libellé principal.
- **Accessibilité** : badges combinent couleur et texte explicite (statut expirée / expire dans X jours).
- **Source de vérité** : le backend reste la dernière barrière ; l’UI masque/désactive uniquement.
