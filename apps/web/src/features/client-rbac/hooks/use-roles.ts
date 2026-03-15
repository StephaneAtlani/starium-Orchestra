'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { getRoles } from '../api/roles';

export function useRoles() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: clientRbacKeys.roles(activeClientId),
    queryFn: () => getRoles(authFetch),
    enabled: !!activeClientId,
  });
}
