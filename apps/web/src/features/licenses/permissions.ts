/**
 * Mapping permissions RFC-ACL-007
 *
 * IMPORTANT:
 * - Aucun code permission explicite n'est décoré sur les endpoints licenses/subscriptions
 *   backend à ce stade (guard principal: PlatformAdminGuard / ClientAdminGuard).
 * - Ne pas inventer de permission string côté frontend.
 * - L'UI applique donc un fallback par rôle et laisse le backend comme source de vérité.
 */
export const licensesPermissionDependencies = {
  subscriptionsRead: null,
  subscriptionsCreate: null,
  subscriptionsUpdate: null,
  subscriptionsTransition: null,
  licenseUsageRead: null,
  licenseAssignmentUpdate: null,
} as const;
