'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { compareBudget } from '@/features/budgets/api/budget-comparison.api';
import type { BudgetComparisonMode } from '@/features/budgets/types/budget-forecast.types';

const STALE_MS = 45_000;

function comparisonReady(
  compareTo: BudgetComparisonMode,
  targetId: string | undefined,
): boolean {
  if (compareTo === 'baseline') return true;
  return !!targetId?.trim();
}

export function useBudgetComparison(
  budgetId: string | null,
  compareTo: BudgetComparisonMode,
  targetId: string | undefined,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const ready = comparisonReady(compareTo, targetId);
  const enabled =
    (options?.enabled ?? true) &&
    !!clientId &&
    !!budgetId &&
    ready;

  return useQuery({
    queryKey: budgetQueryKeys.budgetComparison(
      clientId,
      budgetId ?? '',
      compareTo,
      compareTo === 'baseline' ? undefined : targetId,
    ),
    queryFn: () =>
      compareBudget(
        authFetch,
        budgetId!,
        compareTo,
        compareTo === 'baseline' ? undefined : targetId,
      ),
    enabled,
    staleTime: STALE_MS,
  });
}
