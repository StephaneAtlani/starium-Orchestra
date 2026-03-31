'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listRisks } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectRiskApi } from '../types/project.types';

const STALE = 30_000;

export function useProjectRisksQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.risks(clientId, projectId),
    queryFn: async () => listRisks(authFetch, projectId),
    enabled:
      initialized &&
      (options?.enabled !== false) &&
      !!clientId &&
      !!projectId,
    staleTime: STALE,
  });
}
