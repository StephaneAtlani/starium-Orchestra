import type { AdminPlatformUserSummary } from '../types/admin-studio.types';
import type { AuthFetch } from './get-clients';

export async function getPlatformUsers(
  authFetch: AuthFetch,
): Promise<AdminPlatformUserSummary[]> {
  const res = await authFetch('/api/platform/users');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des utilisateurs globaux');
  }
  const data = (await res.json()) as AdminPlatformUserSummary[];
  return data;
}

