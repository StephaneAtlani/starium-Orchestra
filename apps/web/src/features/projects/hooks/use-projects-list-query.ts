'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjects } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
const STALE = 30_000;

export function useProjectsListQuery(
  apiParams: Record<string, string | number | boolean | undefined>,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.list(clientId, apiParams),
    queryFn: () => listProjects(authFetch, apiParams),
    enabled: !!clientId,
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });
}
