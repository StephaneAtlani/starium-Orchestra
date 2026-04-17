'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectScenarios } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectScenariosQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.scenarios(clientId, projectId),
    queryFn: () => getProjectScenarios(authFetch, projectId),
    enabled:
      (options?.enabled !== false) && Boolean(clientId) && Boolean(projectId),
  });
}
