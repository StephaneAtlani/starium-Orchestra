import type { PlatformUsageOverview } from '../types/admin-studio.types';
import type { AuthFetch } from './get-clients';

export async function getPlatformUsageOverview(
  authFetch: AuthFetch,
): Promise<PlatformUsageOverview> {
  const res = await authFetch('/api/platform/usage-overview');
  if (!res.ok) {
    throw new Error('Impossible de charger les indicateurs plateforme');
  }
  return (await res.json()) as PlatformUsageOverview;
}
