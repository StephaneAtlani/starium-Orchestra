'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { budgetDetail } from '../constants/budget-routes';
import { createLine } from '../api/budget-management.api';
import { updateBudgetLinePlanningManual } from '../api/budget-line-planning.api';
import type { BudgetLineFormValues } from '../schemas/budget-line-form.schema';
import { lineFormToCreatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';
import type { Amounts12 } from '../lib/budget-planning-grid';
import { buildManualPlanningPutPayload } from '../lib/budget-planning-grid';

export type CreateBudgetLineOptions = {
  /** Pas de redirection vers la page budget (ex. formulaire en modale). */
  skipRedirect?: boolean;
  /** Après invalidation des caches (ex. fermer la modale). */
  onCreated?: () => void;
};

/** Payload mutation création : champs formulaire + optionnellement 12 mois pour alimenter le prévisionnel. */
export type CreateBudgetLineMutationInput = BudgetLineFormValues & {
  planningAmounts12?: number[];
};

export function useCreateBudgetLine(
  budgetId: string | null,
  options?: CreateBudgetLineOptions,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  const skipRedirectRef = useRef(options?.skipRedirect);
  skipRedirectRef.current = options?.skipRedirect;
  const onCreatedRef = useRef(options?.onCreated);
  onCreatedRef.current = options?.onCreated;

  return useMutation({
    mutationFn: async (input: CreateBudgetLineMutationInput) => {
      const { planningAmounts12, ...values } = input;
      const payload = lineFormToCreatePayload(values);
      const created = await createLine(authFetch, payload);
      if (planningAmounts12?.length === 12) {
        try {
          await updateBudgetLinePlanningManual(
            authFetch,
            created.id,
            buildManualPlanningPutPayload(planningAmounts12 as unknown as Amounts12),
          );
        } catch {
          toast.error(
            'Ligne créée, mais la répartition prévisionnelle n’a pas pu être enregistrée. Éditez-la depuis le budget.',
          );
        }
      }
      return created;
    },
    onSuccess: (data, variables) => {
      const bid = variables.budgetId || budgetId;
      if (bid) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, bid) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetDetail(clientId, bid) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetSummary(clientId, bid) });
        if (variables.planningAmounts12?.length === 12) {
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetLinePlanning(clientId, data.id),
          });
        }
        onCreatedRef.current?.();
        if (!skipRedirectRef.current) {
          router.push(budgetDetail(bid));
        }
      }
      toast.success('Ligne créée.');
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
