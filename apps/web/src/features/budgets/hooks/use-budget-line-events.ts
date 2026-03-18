'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { listBudgetLineEvents } from '../api/budget-line-financial.api';

export interface UseBudgetLineEventsParams {
  budgetLineId: string | null;
  offset: number;
  limit: number;
  /**
   * Filtre de type d’événement.
   * Tenté côté query param si supporté par l’API ; sinon filtrage côté frontend au rendu.
   */
  eventType?: string;
  enabled?: boolean;
}

export function useBudgetLineEvents({
  budgetLineId,
  offset,
  limit,
  eventType,
  enabled = true,
}: UseBudgetLineEventsParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const filters = { offset, limit, eventType };
  const apiParams = { offset, limit };

  return useQuery({
    queryKey: budgetQueryKeys.budgetLineEvents(clientId, budgetLineId ?? '', filters),
    queryFn: () => listBudgetLineEvents(authFetch, budgetLineId!, apiParams),
    enabled: enabled && !!clientId && !!budgetLineId,
  });
}

