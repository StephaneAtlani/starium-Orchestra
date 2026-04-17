'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectScenario } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectScenarioQuery(
  projectId: string,
  scenarioId: string | null | undefined,
  enabled: boolean,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const id = scenarioId ?? '';

  return useQuery({
    queryKey: projectQueryKeys.scenarioDetail(clientId, projectId, id),
    queryFn: () => getProjectScenario(authFetch, projectId, id),
    enabled: Boolean(clientId) && Boolean(projectId) && Boolean(id) && enabled,
  });
}
