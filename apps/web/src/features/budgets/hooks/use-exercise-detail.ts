'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getExercise } from '../api/budget-management.api';

/**
 * Charge un exercice par id (segment de route [id]).
 * Utilisé par la page d'édition /budgets/exercises/[id]/edit.
 */
export function useExerciseDetail(id: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.exerciseDetail(clientId, id ?? ''),
    queryFn: () => getExercise(authFetch, id!),
    enabled: !!clientId && !!id,
  });
}
