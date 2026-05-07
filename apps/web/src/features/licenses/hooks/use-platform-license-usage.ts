'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getPlatformLicenseUsage } from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function usePlatformLicenseUsage(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: licensesKeys.platformUsage(clientId),
    queryFn: () => getPlatformLicenseUsage(authFetch, clientId),
    enabled: Boolean(clientId),
  });
}
