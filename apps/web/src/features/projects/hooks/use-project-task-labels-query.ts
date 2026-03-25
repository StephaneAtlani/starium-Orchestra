'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectTaskLabels } from '../api/project-task-labels.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectTaskLabelsQuery(
  projectId: string,
  enabled = true,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.taskLabels(clientId, projectId),
    queryFn: () => listProjectTaskLabels(authFetch, projectId),
    enabled: Boolean(clientId && projectId && enabled),
  });
}

