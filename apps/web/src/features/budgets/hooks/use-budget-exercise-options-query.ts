'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgetExerciseOptions } from '../api/get-budget-exercise-options';

const STALE_TIME_MS = 120_000;

export function useBudgetExerciseOptionsQuery() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetExerciseOptions(clientId),
    queryFn: () => getBudgetExerciseOptions(authFetch),
    enabled: !!clientId,
    staleTime: STALE_TIME_MS,
  });
}
