'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectSheet } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectSheetQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.sheet(clientId, projectId),
    queryFn: () => getProjectSheet(authFetch, projectId),
    enabled: !!clientId && !!projectId,
    staleTime: STALE,
  });
}
