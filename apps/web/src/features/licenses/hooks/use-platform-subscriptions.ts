'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getPlatformSubscriptions } from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function usePlatformSubscriptions(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: licensesKeys.platformSubscriptions(clientId),
    queryFn: () => getPlatformSubscriptions(authFetch, clientId),
    enabled: Boolean(clientId),
  });
}
