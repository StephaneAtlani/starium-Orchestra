'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getAccessGroupMembers } from '../api/access-groups';
import { accessGroupsKeys } from '../query-keys';

export function useGroupMembers(groupId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: accessGroupsKeys.members(activeClientId, groupId ?? ''),
    queryFn: () => getAccessGroupMembers(authFetch, groupId!),
    enabled: !!activeClientId && !!groupId,
  });
}
