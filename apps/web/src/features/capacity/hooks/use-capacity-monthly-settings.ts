'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getMonthlySettings } from '../api/capacity.api';
import { capacityQueryKeys } from '../lib/capacity-query-keys';

export function useCapacityMonthlySettings(
  params: { from?: string; to?: string } = {},
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  return useQuery({
    queryKey: capacityQueryKeys.settingsMonthly(clientId, params.from, params.to),
    queryFn: () => getMonthlySettings(authFetch, params),
    enabled: !!clientId && (options?.enabled ?? true),
  });
}
