'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { createLine } from '@/features/budgets/api/budget-management.api';
import type { CreateLinePayload } from '@/features/budgets/api/budget-management.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';

/**
 * Création de ligne budgétaire depuis la fiche projet (sans navigation).
 * Invalide le cache des lignes du budget pour rafraîchir les selects.
 */
export function useCreateBudgetLineInline() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (payload: CreateLinePayload) => createLine(authFetch, payload),
    onSuccess: (_line, variables) => {
      const bid = variables.budgetId;
      if (clientId && bid) {
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, bid),
        });
      }
    },
  });
}
