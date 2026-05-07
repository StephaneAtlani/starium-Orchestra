/**
 * RFC-ACL-010 — politique d'affichage des quick-actions du cockpit licences.
 *
 * Backend = source de vérité (PlatformAdminGuard / ClientAdminGuard appliqués
 * sur `PATCH /api/users/:id/license` et `PATCH /api/platform/clients/:clientId/users/:userId/license`).
 * Cette policy gouverne uniquement l'affichage UI (masquer / désactiver).
 *
 * Réutilisation des capacités existantes :
 * - aucun code permission dédié n'est exposé sur les routes licences
 *   (cf. {@link file://./../../licenses/permissions.ts `licensesPermissionDependencies`}) ;
 * - aucune nouvelle string n'est inventée côté frontend ;
 * - tant que le backend ne décore pas ces routes avec des permissions fines
 *   propagées par `GET /me/permissions`, on garde un fallback **explicite**
 *   par rôle, identique à celui utilisé par les pages CRUD RFC-ACL-007
 *   (cf. `client-licenses-admin-page.tsx`, `platform-client-subscriptions-page.tsx`).
 *
 * TODO (dette technique RFC-ACL-010) : remplacer ce fallback par les
 * permissions décorées côté API dès qu'elles sont disponibles
 * (ex. `licenses.assign`, `subscriptions.transition`).
 */

export interface ActiveClientLike {
  role?: string | null;
}

export interface AuthUserLike {
  platformRole?: string | null;
}

/**
 * Cockpit client — l'utilisateur peut-il déclencher une quick-action
 * (PATCH /api/users/:id/license) ?
 *
 * Fallback rôle : `CLIENT_ADMIN` du client actif (aligné `ClientAdminGuard`).
 */
export function canUseClientLicenseQuickActions(
  activeClient: ActiveClientLike | null | undefined,
): boolean {
  return activeClient?.role === 'CLIENT_ADMIN';
}

/**
 * Cockpit plateforme — l'utilisateur peut-il déclencher une quick-action
 * (PATCH /api/platform/clients/:clientId/users/:userId/license) ?
 *
 * Fallback rôle : `PLATFORM_ADMIN` (aligné `PlatformAdminGuard`).
 */
export function canUsePlatformLicenseQuickActions(
  user: AuthUserLike | null | undefined,
): boolean {
  return user?.platformRole === 'PLATFORM_ADMIN';
}
