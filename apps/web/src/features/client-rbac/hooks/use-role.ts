'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { getRole } from '../api/roles';

export function useRole(roleId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: clientRbacKeys.role(activeClientId, roleId ?? ''),
    queryFn: () => getRole(authFetch, roleId!),
    enabled: !!activeClientId && !!roleId,
  });
}
