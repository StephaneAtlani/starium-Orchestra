'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { getPermissions } from '../api/permissions';

export function usePermissions() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: clientRbacKeys.permissions(activeClientId),
    queryFn: () => getPermissions(authFetch),
    enabled: !!activeClientId,
  });
}
