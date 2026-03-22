'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listTasks } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { PaginatedList, ProjectTaskApi } from '../types/project.types';

const STALE = 30_000;

export function useProjectTasksQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.tasks(clientId, projectId),
    queryFn: async () => listTasks(authFetch, projectId) as Promise<PaginatedList<ProjectTaskApi>>,
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}
