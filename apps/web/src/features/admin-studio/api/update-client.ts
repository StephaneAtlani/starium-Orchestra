import type { AdminClientSummary } from '../types/admin-studio.types';
import type { AuthFetch } from './get-clients';

export interface UpdateClientPayload {
  name: string;
  slug: string;
}

export async function updateClient(
  authFetch: AuthFetch,
  clientId: string,
  payload: UpdateClientPayload,
): Promise<AdminClientSummary> {
  const res = await authFetch(`/api/clients/${clientId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    throw new Error('Un client avec ce slug existe déjà');
  }

  if (!res.ok) {
    throw new Error('Erreur lors de la modification du client');
  }

  const data = (await res.json()) as AdminClientSummary;
  return data;
}

