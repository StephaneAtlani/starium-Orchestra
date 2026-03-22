'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listMilestones } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { PaginatedList, ProjectMilestoneApi } from '../types/project.types';

const STALE = 30_000;

export function useProjectMilestonesQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.milestones(clientId, projectId),
    queryFn: async () =>
      listMilestones(authFetch, projectId) as Promise<PaginatedList<ProjectMilestoneApi>>,
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}
