'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listAssignableUsers } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 60_000;

export function useProjectAssignableUsers(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.assignableUsers(clientId),
    queryFn: () => listAssignableUsers(authFetch),
    enabled: (options?.enabled !== false) && !!clientId,
    staleTime: STALE,
  });
}
