/**
 * API groupes d'accès — RFC-ACL-003 (admin client, contexte actif).
 */

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export interface AccessGroupListItem {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessGroupMemberRow {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export type CreateAccessGroupPayload = { name: string };
export type UpdateAccessGroupPayload = { name: string };

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

export async function getAccessGroups(
  authFetch: AuthFetch,
): Promise<AccessGroupListItem[]> {
  const res = await authFetch('/api/access-groups');
  return handleResponse<AccessGroupListItem[]>(res);
}

export async function getAccessGroup(
  authFetch: AuthFetch,
  groupId: string,
): Promise<AccessGroupListItem> {
  const res = await authFetch(`/api/access-groups/${groupId}`);
  return handleResponse<AccessGroupListItem>(res);
}

export async function createAccessGroup(
  authFetch: AuthFetch,
  dto: CreateAccessGroupPayload,
): Promise<AccessGroupListItem> {
  const res = await authFetch('/api/access-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<AccessGroupListItem>(res);
}

export async function updateAccessGroup(
  authFetch: AuthFetch,
  groupId: string,
  dto: UpdateAccessGroupPayload,
): Promise<AccessGroupListItem> {
  const res = await authFetch(`/api/access-groups/${groupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<AccessGroupListItem>(res);
}

export async function deleteAccessGroup(
  authFetch: AuthFetch,
  groupId: string,
): Promise<void> {
  const res = await authFetch(`/api/access-groups/${groupId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la suppression');
    throw new Error(message);
  }
}

export async function getAccessGroupMembers(
  authFetch: AuthFetch,
  groupId: string,
): Promise<AccessGroupMemberRow[]> {
  const res = await authFetch(`/api/access-groups/${groupId}/members`);
  return handleResponse<AccessGroupMemberRow[]>(res);
}

export async function addAccessGroupMember(
  authFetch: AuthFetch,
  groupId: string,
  userId: string,
): Promise<AccessGroupMemberRow> {
  const res = await authFetch(`/api/access-groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handleResponse<AccessGroupMemberRow>(res);
}

export async function removeAccessGroupMember(
  authFetch: AuthFetch,
  groupId: string,
  userId: string,
): Promise<void> {
  const res = await authFetch(
    `/api/access-groups/${groupId}/members/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors du retrait du membre');
    throw new Error(message);
  }
}
