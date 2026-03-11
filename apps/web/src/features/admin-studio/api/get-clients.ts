import type { AdminClientSummary } from '../types/admin-studio.types';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export async function getClients(
  authFetch: AuthFetch,
): Promise<AdminClientSummary[]> {
  const res = await authFetch('/api/clients');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des clients');
  }
  const data = (await res.json()) as AdminClientSummary[];
  return data;
}

