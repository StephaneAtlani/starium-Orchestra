'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getActionPlan } from '../api/action-plans.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useActionPlanDetailQuery(
  actionPlanId: string | undefined,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const allow = options?.enabled !== false;

  return useQuery({
    queryKey: projectQueryKeys.actionPlanDetail(clientId, actionPlanId ?? ''),
    queryFn: () => getActionPlan(authFetch, actionPlanId!),
    enabled: !!clientId && !!actionPlanId && allow,
    staleTime: STALE,
  });
}
