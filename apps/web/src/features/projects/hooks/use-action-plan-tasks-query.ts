'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listActionPlanTasks } from '../api/action-plans.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 15_000;

export function useActionPlanTasksQuery(
  actionPlanId: string | undefined,
  params: {
    status?: string;
    priority?: string;
    projectId?: string;
    riskId?: string;
    ownerUserId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const allow = options?.enabled !== false;

  return useQuery({
    queryKey: projectQueryKeys.actionPlanTasks(clientId, actionPlanId ?? '', params),
    queryFn: () => listActionPlanTasks(authFetch, actionPlanId!, params),
    enabled: !!clientId && !!actionPlanId && allow,
    staleTime: STALE,
    placeholderData: (prev) => prev,
  });
}
