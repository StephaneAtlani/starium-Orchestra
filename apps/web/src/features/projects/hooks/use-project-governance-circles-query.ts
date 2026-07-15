'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectGovernanceCircles } from '../api/project-governance-circles.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectGovernanceCirclesQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.governanceCircles(clientId, projectId),
    queryFn: () => listProjectGovernanceCircles(authFetch, projectId),
    enabled: Boolean(clientId && projectId) && (options?.enabled ?? true),
  });
}
