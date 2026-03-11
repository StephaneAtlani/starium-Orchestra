import type { AdminClientUserSummary } from '../types/admin-studio.types';

export interface GetClientUsersResponse {
  users: AdminClientUserSummary[];
}

export async function getClientUsers(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  clientId: string,
): Promise<GetClientUsersResponse> {
  const res = await authFetch(`/api/clients/${clientId}/users`);
  if (!res.ok) {
    throw new Error("Impossible de charger les utilisateurs rattachés à ce client");
  }
  const data = (await res.json()) as GetClientUsersResponse;
  return data;
}

