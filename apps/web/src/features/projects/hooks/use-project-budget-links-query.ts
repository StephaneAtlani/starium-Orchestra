'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectBudgetLinks } from '../api/project-budget.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectBudgetLinksQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.budgetLinks(clientId, projectId),
    queryFn: () =>
      listProjectBudgetLinks(authFetch, projectId, { limit: 100, offset: 0 }),
    enabled: !!clientId && !!projectId,
    staleTime: STALE,
  });
}
