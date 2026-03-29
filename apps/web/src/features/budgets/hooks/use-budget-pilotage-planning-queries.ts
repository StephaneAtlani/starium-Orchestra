'use client';

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import type { ApiFormError } from '../api/types';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';
import { getBudgetLinePlanning } from '../api/budget-line-planning.api';

const PILOTAGE_PLANNING_STALE_MS = 30_000;

export interface UseBudgetPilotagePlanningQueriesOptions {
  /** Identifiants des lignes pour lesquelles charger le planning (p.ex. page courante ou viewport). */
  lineIdsToFetch: string[];
  /** false si onglet Structure ou écran sans pilotage. */
  pilotageActive: boolean;
}

/**
 * Fan-out GET planning par ligne — activé uniquement si `pilotageActive` et client connu.
 * Le parent borne `lineIdsToFetch` (pagination >50, fenêtre visible, etc.).
 */
export function useBudgetPilotagePlanningQueries({
  lineIdsToFetch,
  pilotageActive,
}: UseBudgetPilotagePlanningQueriesOptions) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const enabledBase = !!clientId && pilotageActive;

  return useQueries({
    queries: lineIdsToFetch.map((lineId) => ({
      queryKey: budgetQueryKeys.budgetLinePlanning(clientId, lineId),
      queryFn: () => getBudgetLinePlanning(authFetch, lineId),
      enabled: enabledBase && !!lineId,
      staleTime: PILOTAGE_PLANNING_STALE_MS,
    })),
  });
}

export type PilotagePlanningQueryResult = {
  lineId: string;
  data: BudgetLinePlanningResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiFormError | null;
};

/**
 * Zip lineIds avec les résultats useQueries (même ordre).
 */
export function zipPilotagePlanningResults(
  lineIds: string[],
  results: UseQueryResult<BudgetLinePlanningResponse, unknown>[],
): PilotagePlanningQueryResult[] {
  return lineIds.map((lineId, i) => {
    const r = results[i];
    return {
      lineId,
      data: r?.data,
      isLoading: r?.isLoading ?? false,
      isError: r?.isError ?? false,
      error: (r?.error as ApiFormError | null) ?? null,
    };
  });
}
