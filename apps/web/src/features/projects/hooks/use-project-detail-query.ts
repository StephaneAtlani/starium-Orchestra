'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProject } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectDetailQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.detail(clientId, projectId),
    queryFn: () => getProject(authFetch, projectId),
    enabled: initialized && !!clientId && !!projectId,
    staleTime: STALE,
  });
}
