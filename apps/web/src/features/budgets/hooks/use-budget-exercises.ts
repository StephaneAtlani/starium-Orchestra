'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import * as api from '../api/budget-management.api';
import type { ListBudgetExercisesQuery } from '../types/budget-management.types';

export function useBudgetExercisesList(query?: ListBudgetExercisesQuery) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.exercises(clientId, query),
    queryFn: () => api.listExercises(authFetch, query),
    enabled: !!clientId,
  });
}

export function useBudgetExerciseSummary(exerciseId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.exerciseSummary(clientId, exerciseId ?? ''),
    queryFn: () => api.getExercise(authFetch, exerciseId!),
    enabled: !!clientId && !!exerciseId,
  });
}
