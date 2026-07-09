'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectAuditHistory } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectAuditHistory(
  projectId: string,
  params: { limit: number; offset: number },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.history(clientId, projectId, params),
    queryFn: () => getProjectAuditHistory(authFetch, projectId, params),
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}
