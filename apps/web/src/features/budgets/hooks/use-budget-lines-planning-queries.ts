'use client';

import { useQueries } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getBudgetLinePlanning } from '../api/budget-line-planning.api';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';

const STALE_MS = 30_000;

export interface UseBudgetLinesPlanningQueriesOptions {
  /** Ids des lignes du périmètre courant (page / fenêtre). */
  lineIds: readonly string[];
  /** false = aucune requête (ex. pas de lignes, client absent). */
  enabled: boolean;
}

/**
 * Fan-out GET planning par ligne — activé uniquement quand `enabled` et périmètre non vide.
 * Évolution : endpoint batch (hors MVP).
 */
export function useBudgetLinesPlanningQueries(options: UseBudgetLinesPlanningQueriesOptions) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const lineIds = options.lineIds;
  const enabled = options.enabled && !!clientId && lineIds.length > 0;

  const results = useQueries({
    queries: lineIds.map((lineId) => ({
      queryKey: budgetQueryKeys.budgetLinePlanning(clientId, lineId),
      queryFn: () => getBudgetLinePlanning(authFetch, lineId),
      enabled: enabled && !!lineId,
      staleTime: STALE_MS,
    })),
  });

  const planningByLineId = new Map<string, BudgetLinePlanningResponse>();
  lineIds.forEach((lineId, i) => {
    const data = results[i]?.data;
    if (data) {
      planningByLineId.set(lineId, data);
    }
  });

  const isLoading = results.some((r) => r.isLoading);
  const isFetching = results.some((r) => r.isFetching);

  return { planningByLineId, results, isLoading, isFetching };
}
