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
  role: 'CLIENT_ADMIN' | 'CLIENT_USER' | string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED' | string;
  [key: string]: unknown;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la requête');
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

export type CreateClientMemberPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  /** Obligatoire si l’email n’existe pas encore dans la plateforme. */
  password?: string;
};

/** POST /api/users — crée l’utilisateur ou rattache un compte existant au client. */
export type UpdateClientMemberPayload = {
  firstName?: string;
  lastName?: string;
  role?: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
};

/** PATCH /api/users/:id — prénom, nom, rôle et statut sur ce client. */
export async function updateClientMember(
  authFetch: AuthFetch,
  userId: string,
  payload: UpdateClientMemberPayload,
): Promise<ClientMember> {
  const res = await authFetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<ClientMember>(res);
}

export async function createClientMember(
  authFetch: AuthFetch,
  payload: CreateClientMemberPayload,
): Promise<ClientMember> {
  const body: Record<string, unknown> = {
    email: payload.email.trim(),
    role: payload.role,
  };
  if (payload.firstName?.trim()) body.firstName = payload.firstName.trim();
  if (payload.lastName?.trim()) body.lastName = payload.lastName.trim();
  if (payload.password?.length) body.password = payload.password;

  const res = await authFetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<ClientMember>(res);
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
