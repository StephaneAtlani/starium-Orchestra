import type { AdminClientSummary } from '../types/admin-studio.types';

interface CreateClientPayload {
  name: string;
  slug: string;
}

export async function createClient(
  payload: CreateClientPayload,
): Promise<AdminClientSummary> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    throw new Error('Un client avec ce slug existe déjà');
  }

  if (!res.ok) {
    throw new Error('Erreur lors de la création du client');
  }

  const data = (await res.json()) as AdminClientSummary;
  return data;
}

