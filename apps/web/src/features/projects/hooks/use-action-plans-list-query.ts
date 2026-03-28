'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listActionPlans } from '../api/action-plans.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useActionPlansListQuery(
  params: { search?: string; offset?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const allow = options?.enabled !== false;

  return useQuery({
    queryKey: projectQueryKeys.actionPlansList(clientId, params),
    queryFn: () => listActionPlans(authFetch, params),
    enabled: !!clientId && allow,
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });
}
