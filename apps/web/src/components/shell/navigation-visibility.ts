import type { NavigationItem } from '@/config/navigation';

export type NavigationVisibilityContext = {
  platformRole: string | null;
  clientRole: string | null;
  has: (code: string) => boolean;
  permsSuccess: boolean;
  /** RFC-ACL-004 : false si le module est masqué pour l’utilisateur (backend /me/permissions). */
  isModuleVisible: (moduleCode: string) => boolean;
};

/**
 * Détermine si un item de navigation doit être affiché.
 * `requiredPermissionsMatch` vaut `all` par défaut : toutes les permissions requises.
 * `any` : au moins une permission dans `requiredPermissions`.
 */
export function navigationItemVisible(
  item: NavigationItem,
  ctx: NavigationVisibilityContext,
): boolean {
  const { platformRole, clientRole, has, permsSuccess, isModuleVisible } = ctx;
  if (item.platformOnly && platformRole !== 'PLATFORM_ADMIN') return false;
  if (item.clientAdminOnly && clientRole !== 'CLIENT_ADMIN') return false;
  if (item.allowedClientRoles != null) {
    if (clientRole == null || !item.allowedClientRoles.includes(clientRole)) return false;
  }
  if (item.requiredPermissions?.length) {
    if (!permsSuccess) return false;
    const match = item.requiredPermissionsMatch ?? 'all';
    if (match === 'any') {
      if (!item.requiredPermissions.some((code) => has(code))) return false;
    } else {
      for (const code of item.requiredPermissions) {
        if (!has(code)) return false;
      }
    }
  }
  if (item.scope === 'client' && item.moduleCode) {
    if (!permsSuccess) return false;
    if (!has(`${item.moduleCode}.read`)) return false;
    if (!isModuleVisible(item.moduleCode)) return false;
  }
  return true;
}
