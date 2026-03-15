'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgetExercises } from '../api/get-budget-exercises';
import type { BudgetExercisesListParams } from '../types/budget-list.types';

const STALE_TIME_MS = 60_000;

export function useBudgetExercisesQuery(filters: BudgetExercisesListParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetExercisesList(clientId, filters),
    queryFn: () => getBudgetExercises(authFetch, filters),
    enabled: !!clientId,
    placeholderData: (previousData) => previousData,
    staleTime: STALE_TIME_MS,
  });
}
