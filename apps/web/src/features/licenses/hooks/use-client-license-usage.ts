'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getClientLicenseUsage } from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function useClientLicenseUsage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: licensesKeys.clientUsage(activeClientId),
    queryFn: () => getClientLicenseUsage(authFetch),
    enabled: Boolean(activeClientId),
  });
}
