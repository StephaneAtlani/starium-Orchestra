'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { listBudgetsForExercise } from '../api/budget-reporting.api';
import type { ListBudgetsForExerciseQuery } from '../types/budget-reporting.types';

const STALE_TIME_MS = 60_000;

export function useExerciseBudgetsReportingQuery(
  exerciseId: string | null | undefined,
  query?: ListBudgetsForExerciseQuery,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['budgets', clientId, 'exercise-budgets-reporting', exerciseId ?? '', query] as const,
    queryFn: () => listBudgetsForExercise(authFetch, exerciseId!, query),
    enabled: !!clientId && !!exerciseId && enabled,
    placeholderData: (previousData) => previousData,
    staleTime: STALE_TIME_MS,
  });
}
