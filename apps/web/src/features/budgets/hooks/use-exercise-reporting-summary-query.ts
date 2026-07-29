'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getExerciseSummary } from '../api/budget-reporting.api';

const STALE_TIME_MS = 60_000;

export function useExerciseReportingSummaryQuery(
  exerciseId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: budgetQueryKeys.exerciseSummary(clientId, exerciseId ?? ''),
    queryFn: () => getExerciseSummary(authFetch, exerciseId!),
    enabled: !!clientId && !!exerciseId && enabled,
    staleTime: STALE_TIME_MS,
  });
}
