/**
 * Clés TanStack Query pour client-rbac (tenant-aware).
 * Toutes les clés incluent activeClientId pour isoler le cache par client.
 */

export const clientRbacKeys = {
  all: ['client-rbac'] as const,
  roles: (activeClientId: string) =>
    [...clientRbacKeys.all, 'roles', activeClientId] as const,
  role: (activeClientId: string, roleId: string) =>
    [...clientRbacKeys.all, 'role', activeClientId, roleId] as const,
  permissions: (activeClientId: string) =>
    [...clientRbacKeys.all, 'permissions', activeClientId] as const,
  members: (activeClientId: string) =>
    [...clientRbacKeys.all, 'members', activeClientId] as const,
  userRoles: (activeClientId: string, userId: string) =>
    [...clientRbacKeys.all, 'user-roles', activeClientId, userId] as const,
};
