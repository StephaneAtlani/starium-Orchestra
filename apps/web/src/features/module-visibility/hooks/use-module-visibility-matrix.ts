'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { moduleVisibilityKeys } from '../query-keys';
import { getModuleVisibilityMatrix } from '../api/module-visibility';

export function useModuleVisibilityMatrix() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: moduleVisibilityKeys.matrix(activeClientId),
    queryFn: () => getModuleVisibilityMatrix(authFetch),
    enabled: !!activeClientId,
  });
}
