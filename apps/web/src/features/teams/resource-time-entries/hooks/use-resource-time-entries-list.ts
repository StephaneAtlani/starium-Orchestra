'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listResourceTimeEntries } from '../api/resource-time-entries.api';
import type { ResourceTimeEntriesListParams } from '../types/resource-time-entry.types';

export function useResourceTimeEntriesList(
  params: ResourceTimeEntriesListParams,
  enabled = true,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: ['resource-time-entries', clientId, params] as const,
    queryFn: () => listResourceTimeEntries(authFetch, params),
    enabled: enabled && !!clientId,
  });
}
