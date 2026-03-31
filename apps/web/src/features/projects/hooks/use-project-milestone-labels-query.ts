'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectMilestoneLabels } from '../api/project-milestone-labels.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectMilestoneLabelsQuery(
  projectId: string,
  enabled = true,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.milestoneLabels(clientId, projectId),
    queryFn: () => listProjectMilestoneLabels(authFetch, projectId),
    enabled: Boolean(clientId && projectId && enabled),
  });
}

