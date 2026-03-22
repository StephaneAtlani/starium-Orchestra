'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getPortfolioSummary } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function usePortfolioSummaryQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const allow = options?.enabled !== false;

  return useQuery({
    queryKey: projectQueryKeys.summary(clientId),
    queryFn: () => getPortfolioSummary(authFetch),
    enabled: !!clientId && allow,
    staleTime: STALE,
  });
}
