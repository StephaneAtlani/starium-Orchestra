'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateExercise } from '../api/budget-management.api';
import { budgetExercisesList } from '../constants/budget-routes';
import type { BudgetExerciseFormValues } from '../schemas/budget-exercise-form.schema';
import { exerciseFormToUpdatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useUpdateBudgetExercise(id: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: BudgetExerciseFormValues) => {
      if (!id) throw new Error('ID exercice manquant');
      const payload = exerciseFormToUpdatePayload(values);
      return updateExercise(authFetch, id, payload);
    },
    onSuccess: () => {
      if (id) queryClient.invalidateQueries({ queryKey: budgetQueryKeys.exerciseDetail(clientId, id) });
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.exercises(clientId) });
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetList(clientId) });
      toast.success('Exercice mis à jour.');
      router.push(budgetExercisesList());
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
