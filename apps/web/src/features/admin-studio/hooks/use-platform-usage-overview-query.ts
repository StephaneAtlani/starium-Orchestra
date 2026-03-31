import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getPlatformUsageOverview } from '../api/get-platform-usage-overview';
import type { PlatformUsageOverview } from '../types/admin-studio.types';

export const PLATFORM_USAGE_OVERVIEW_QUERY_KEY = ['platform-usage-overview'] as const;

export function usePlatformUsageOverviewQuery() {
  const { accessToken, user } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const isPlatformAdmin = user?.platformRole === 'PLATFORM_ADMIN';

  return useQuery<PlatformUsageOverview>({
    queryKey: PLATFORM_USAGE_OVERVIEW_QUERY_KEY,
    queryFn: () => getPlatformUsageOverview(authenticatedFetch),
    enabled: !!accessToken && isPlatformAdmin,
    staleTime: 60_000,
  });
}
