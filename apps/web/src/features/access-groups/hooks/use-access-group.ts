'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getAccessGroup } from '../api/access-groups';
import { accessGroupsKeys } from '../query-keys';

export function useAccessGroup(groupId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: accessGroupsKeys.group(activeClientId, groupId ?? ''),
    queryFn: () => getAccessGroup(authFetch, groupId!),
    enabled: !!activeClientId && !!groupId,
  });
}
