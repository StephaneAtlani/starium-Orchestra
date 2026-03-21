'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listMilestones } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectMilestoneApi } from '../types/project.types';

const STALE = 30_000;

export function useProjectMilestonesQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.milestones(clientId, projectId),
    queryFn: async () => (await listMilestones(authFetch, projectId)) as ProjectMilestoneApi[],
    enabled: !!clientId && !!projectId,
    staleTime: STALE,
  });
}
