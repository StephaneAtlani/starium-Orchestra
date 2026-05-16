'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getAccessModelHealth } from '../api/access-model.api';
import { accessModelKeys } from '../query-keys';

export function useAccessModelHealth() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();

  return useQuery({
    queryKey: accessModelKeys.health(),
    queryFn: () => getAccessModelHealth(authFetch),
    enabled: !!activeClient?.id,
    staleTime: 60_000,
  });
}
