'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { listEnvelopeForecastLines } from '@/features/budgets/api/budget-forecast.api';

const STALE_MS = 45_000;

export function useEnvelopeForecastLines(
  envelopeId: string | null,
  params: { limit: number; offset: number },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled =
    (options?.enabled ?? true) && !!clientId && !!envelopeId;

  return useQuery({
    queryKey: budgetQueryKeys.envelopeForecastLines(
      clientId,
      envelopeId ?? '',
      params,
    ),
    queryFn: () =>
      listEnvelopeForecastLines(authFetch, envelopeId!, {
        limit: params.limit,
        offset: params.offset,
      }),
    enabled,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}
