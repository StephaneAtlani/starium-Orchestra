/**
 * API rôles — GET/POST /api/roles, GET/PATCH/DELETE /api/roles/:id, PUT /api/roles/:id/permissions.
 */

import type {
  CreateRoleDto,
  RoleDetail,
  RoleListItem,
  UpdateRoleDto,
  ReplaceRolePermissionsDto,
} from '../types';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string })?.message ?? 'Erreur lors de la requête';
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getRoles(authFetch: AuthFetch): Promise<RoleListItem[]> {
  const res = await authFetch('/api/roles');
  return handleResponse<RoleListItem[]>(res);
}

export async function getRole(
  authFetch: AuthFetch,
  roleId: string,
): Promise<RoleDetail> {
  const res = await authFetch(`/api/roles/${roleId}`);
  return handleResponse<RoleDetail>(res);
}

export async function createRole(
  authFetch: AuthFetch,
  dto: CreateRoleDto,
): Promise<RoleListItem> {
  const res = await authFetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<RoleListItem>(res);
}

export async function updateRole(
  authFetch: AuthFetch,
  roleId: string,
  dto: UpdateRoleDto,
): Promise<RoleListItem> {
  const res = await authFetch(`/api/roles/${roleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<RoleListItem>(res);
}

export async function deleteRole(
  authFetch: AuthFetch,
  roleId: string,
): Promise<void> {
  const res = await authFetch(`/api/roles/${roleId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(msg) ? msg[0] : msg ?? 'Erreur lors de la suppression';
    throw new Error(message);
  }
}

export async function updateRolePermissions(
  authFetch: AuthFetch,
  roleId: string,
  dto: ReplaceRolePermissionsDto,
): Promise<{ role: RoleListItem; permissionIds: string[] }> {
  const res = await authFetch(`/api/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<{ role: RoleListItem; permissionIds: string[] }>(res);
}
