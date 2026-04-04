'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import type { ApiFormError } from '../api/types';
import type {
  ApplyAnnualSpreadPayload,
  ApplyCalculationPlanningPayload,
  ApplyGrowthPlanningPayload,
  ApplyOneShotPlanningPayload,
  ApplyQuarterlyPlanningPayload,
  BudgetLinePlanningResponse,
  CalculatePlanningPayload,
  CalculatePlanningPreviewResponse,
} from '../types/budget-line-planning.types';
import {
  applyBudgetLineAnnualSpread,
  applyBudgetLineCalculation,
  applyBudgetLineGrowth,
  applyBudgetLineOneShot,
  applyBudgetLineQuarterly,
  calculateBudgetLinePlanning,
  getBudgetLinePlanning,
  updateBudgetLinePlanningManual,
  type UpdateBudgetLinePlanningManualPayload,
} from '../api/budget-line-planning.api';

export function useBudgetLinePlanning(lineId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery<BudgetLinePlanningResponse, ApiFormError>({
    queryKey: budgetQueryKeys.budgetLinePlanning(clientId, lineId ?? ''),
    queryFn: () => getBudgetLinePlanning(authFetch, lineId!),
    enabled: !!clientId && !!lineId,
  });
}

function useInvalidatePlanningRelatedQueries(
  clientId: string,
  budgetId: string | null,
  lineId: string | null,
) {
  const queryClient = useQueryClient();

  return async () => {
    const promises: Promise<unknown>[] = [];

    if (clientId && lineId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinePlanning(clientId, lineId),
        }),
      );
    }

    if (clientId && budgetId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
        }),
      );
      promises.push(
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
        }),
      );
      promises.push(
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
        }),
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };
}

export function useUpdateBudgetLinePlanningManualMutation(
  lineId: string | null,
  budgetId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = useInvalidatePlanningRelatedQueries(clientId, budgetId, lineId);

  return useMutation<BudgetLinePlanningResponse, ApiFormError, UpdateBudgetLinePlanningManualPayload>({
    mutationFn: async (payload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return updateBudgetLinePlanningManual(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Planning de la ligne mis à jour.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

/** PUT manuel avec `lineId` variable — grille multi-lignes (RFC-024). */
export function useUpdateBudgetLinePlanningManualForBudgetMutation(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation<
    BudgetLinePlanningResponse,
    ApiFormError,
    { lineId: string; payload: UpdateBudgetLinePlanningManualPayload }
  >({
    mutationFn: async ({ lineId, payload }) =>
      updateBudgetLinePlanningManual(authFetch, lineId, payload),
    onSuccess: async (_data, variables) => {
      if (clientId && variables.lineId) {
        await queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinePlanning(clientId, variables.lineId),
        });
      }
      if (clientId && budgetId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
          }),
        ]);
      }
      toast.success('Planning de la ligne mis à jour.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

export function useApplyBudgetLineAnnualSpreadMutation(
  lineId: string | null,
  budgetId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = useInvalidatePlanningRelatedQueries(clientId, budgetId, lineId);

  return useMutation<BudgetLinePlanningResponse, ApiFormError, ApplyAnnualSpreadPayload>({
    mutationFn: async (payload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return applyBudgetLineAnnualSpread(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Répartition annuelle appliquée au planning.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

export function useApplyBudgetLineQuarterlyMutation(
  lineId: string | null,
  budgetId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = useInvalidatePlanningRelatedQueries(clientId, budgetId, lineId);

  return useMutation<BudgetLinePlanningResponse, ApiFormError, ApplyQuarterlyPlanningPayload>({
    mutationFn: async (payload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return applyBudgetLineQuarterly(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Répartition trimestrielle appliquée au planning.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

export function useApplyBudgetLineOneShotMutation(
  lineId: string | null,
  budgetId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = useInvalidatePlanningRelatedQueries(clientId, budgetId, lineId);

  return useMutation<BudgetLinePlanningResponse, ApiFormError, ApplyOneShotPlanningPayload>({
    mutationFn: async (payload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return applyBudgetLineOneShot(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('One-shot appliqué au planning.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

export function useApplyBudgetLineGrowthMutation(
  lineId: string | null,
  budgetId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = useInvalidatePlanningRelatedQueries(clientId, budgetId, lineId);

  return useMutation<BudgetLinePlanningResponse, ApiFormError, ApplyGrowthPlanningPayload>({
    mutationFn: async (payload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return applyBudgetLineGrowth(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Planning par croissance appliqué.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

export function useCalculateBudgetLinePlanningMutation(lineId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation<CalculatePlanningPreviewResponse, ApiFormError, CalculatePlanningPayload>({
    mutationFn: async (payload) => {
      if (!clientId) throw new Error('Client actif manquant');
      if (!lineId) throw new Error('ID ligne manquant');
      return calculateBudgetLinePlanning(authFetch, lineId, payload);
    },
    onError: (err) => {
      throw err;
    },
  });
}

export function useApplyBudgetLineCalculationMutation(
  lineId: string | null,
  budgetId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = useInvalidatePlanningRelatedQueries(clientId, budgetId, lineId);

  return useMutation<BudgetLinePlanningResponse, ApiFormError, ApplyCalculationPlanningPayload>({
    mutationFn: async (payload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return applyBudgetLineCalculation(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success('Calcul appliqué au planning de la ligne.');
    },
    onError: (err) => {
      throw err;
    },
  });
}

