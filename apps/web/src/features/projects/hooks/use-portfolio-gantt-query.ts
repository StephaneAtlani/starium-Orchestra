'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getPortfolioGantt } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

/** Paramètres liste sans pagination — alignés sur `useProjectsListQuery`. */
export function usePortfolioGanttQuery(
  apiParams: Record<string, string | number | boolean | undefined>,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const allow = options?.enabled !== false;

  const ganttParams = useMemo(() => {
    const { page: _p, limit: _l, ...rest } = apiParams;
    return rest;
  }, [apiParams]);

  return useQuery({
    queryKey: projectQueryKeys.portfolioGantt(clientId, ganttParams),
    queryFn: () => getPortfolioGantt(authFetch, ganttParams as Parameters<typeof getPortfolioGantt>[1]),
    enabled: !!clientId && allow,
    staleTime: STALE,
  });
}
