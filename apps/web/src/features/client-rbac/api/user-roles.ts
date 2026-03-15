/**
 * API user-roles — GET /api/users (membres), GET/PUT /api/users/:id/roles.
 */

import type { UserRoleAssignment } from '../types';
import type { ReplaceUserRolesDto } from '../types';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export interface ClientMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  [key: string]: unknown;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string })?.message ?? 'Erreur lors de la requête';
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getClientMembers(
  authFetch: AuthFetch,
): Promise<ClientMember[]> {
  const res = await authFetch('/api/users');
  return handleResponse<ClientMember[]>(res);
}

export async function getUserRoles(
  authFetch: AuthFetch,
  userId: string,
): Promise<UserRoleAssignment[]> {
  const res = await authFetch(`/api/users/${userId}/roles`);
  return handleResponse<UserRoleAssignment[]>(res);
}

export async function updateUserRoles(
  authFetch: AuthFetch,
  userId: string,
  dto: ReplaceUserRolesDto,
): Promise<{ userId: string; roleIds: string[] }> {
  const res = await authFetch(`/api/users/${userId}/roles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<{ userId: string; roleIds: string[] }>(res);
}
