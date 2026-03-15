/**
 * API permissions — GET /api/permissions.
 */

import type { PermissionListItem } from '../types';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export async function getPermissions(
  authFetch: AuthFetch,
): Promise<PermissionListItem[]> {
  const res = await authFetch('/api/permissions');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string })?.message ?? 'Erreur lors de la requête';
    throw new Error(message);
  }
  return res.json() as Promise<PermissionListItem[]>;
}
