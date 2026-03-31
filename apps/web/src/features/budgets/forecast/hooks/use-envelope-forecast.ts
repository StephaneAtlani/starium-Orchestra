'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { getEnvelopeForecast } from '@/features/budgets/api/budget-forecast.api';

const STALE_MS = 45_000;

export function useEnvelopeForecast(
  envelopeId: string | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled =
    (options?.enabled ?? true) && !!clientId && !!envelopeId;

  return useQuery({
    queryKey: budgetQueryKeys.envelopeForecast(clientId, envelopeId ?? ''),
    queryFn: () => getEnvelopeForecast(authFetch, envelopeId!),
    enabled,
    staleTime: STALE_MS,
  });
}
