import type { AdminClientSummary } from '../types/admin-studio.types';

export async function getClients(): Promise<AdminClientSummary[]> {
  const res = await fetch('/api/clients');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des clients');
  }
  const data = (await res.json()) as AdminClientSummary[];
  return data;
}

