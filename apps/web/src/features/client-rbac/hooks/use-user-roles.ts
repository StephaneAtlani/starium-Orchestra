'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { getUserRoles } from '../api/user-roles';

export function useUserRoles(userId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: clientRbacKeys.userRoles(activeClientId, userId ?? ''),
    queryFn: () => getUserRoles(authFetch, userId!),
    enabled: !!activeClientId && !!userId,
  });
}
