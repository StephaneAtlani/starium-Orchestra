'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getAccessGroups } from '../api/access-groups';
import { accessGroupsKeys } from '../query-keys';

export function useAccessGroups() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: accessGroupsKeys.list(activeClientId),
    queryFn: () => getAccessGroups(authFetch),
    enabled: !!activeClientId,
  });
}
