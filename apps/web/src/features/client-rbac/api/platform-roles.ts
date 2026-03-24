import type {
  CreateRoleDto,
  ReplaceRolePermissionsDto,
  RoleDetail,
  RoleListItem,
  UpdateRoleDto,
} from '../types';
import type { AuthFetch } from './roles';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { message?: string | string[] })?.message;
    throw new Error(Array.isArray(message) ? message[0] : message ?? 'Erreur API rôles globaux');
  }
  return res.json() as Promise<T>;
}

export async function getPlatformRoles(authFetch: AuthFetch): Promise<RoleListItem[]> {
  const res = await authFetch('/api/platform/roles');
  return handleResponse<RoleListItem[]>(res);
}

export async function getPlatformRole(
  authFetch: AuthFetch,
  roleId: string,
): Promise<RoleDetail> {
  const res = await authFetch(`/api/platform/roles/${roleId}`);
  return handleResponse<RoleDetail>(res);
}

export async function createPlatformRole(
  authFetch: AuthFetch,
  dto: CreateRoleDto,
): Promise<RoleListItem> {
  const res = await authFetch('/api/platform/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<RoleListItem>(res);
}

export async function updatePlatformRole(
  authFetch: AuthFetch,
  roleId: string,
  dto: UpdateRoleDto,
): Promise<RoleListItem> {
  const res = await authFetch(`/api/platform/roles/${roleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<RoleListItem>(res);
}

export async function deletePlatformRole(
  authFetch: AuthFetch,
  roleId: string,
): Promise<void> {
  const res = await authFetch(`/api/platform/roles/${roleId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { message?: string | string[] })?.message;
    throw new Error(Array.isArray(msg) ? msg[0] : msg ?? 'Erreur suppression rôle global');
  }
}

export async function updatePlatformRolePermissions(
  authFetch: AuthFetch,
  roleId: string,
  dto: ReplaceRolePermissionsDto,
): Promise<{ role: RoleListItem; permissionIds: string[] }> {
  const res = await authFetch(`/api/platform/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<{ role: RoleListItem; permissionIds: string[] }>(res);
}
