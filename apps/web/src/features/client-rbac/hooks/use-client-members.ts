'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { getClientMembers } from '../api/user-roles';

export function useClientMembers() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: clientRbacKeys.members(activeClientId),
    queryFn: () => getClientMembers(authFetch),
    enabled: !!activeClientId,
  });
}
