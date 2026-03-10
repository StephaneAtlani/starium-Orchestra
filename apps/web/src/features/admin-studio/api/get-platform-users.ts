import type { AdminPlatformUserSummary } from '../types/admin-studio.types';

export async function getPlatformUsers(): Promise<AdminPlatformUserSummary[]> {
  const res = await fetch('/api/platform/users');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des utilisateurs globaux');
  }
  const data = (await res.json()) as AdminPlatformUserSummary[];
  return data;
}

