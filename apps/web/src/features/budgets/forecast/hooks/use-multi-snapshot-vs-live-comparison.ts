'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { compareBudget } from '@/features/budgets/api/budget-comparison.api';
import type { BudgetComparisonResponse } from '@/features/budgets/types/budget-forecast.types';
import { mergeLiveVsManySnapshotResponses } from '@/features/budgets/forecast/lib/merge-live-vs-snapshot-responses';

const STALE_MS = 45_000;

export const MIN_MULTI_SNAPSHOTS = 2;
export const MAX_MULTI_SNAPSHOTS = 4;

function uniqueOrdered(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const t = id?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function useMultiSnapshotVsLiveComparison(
  budgetId: string | null,
  snapshotIds: string[],
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const ids = useMemo(
    () => uniqueOrdered(snapshotIds).slice(0, MAX_MULTI_SNAPSHOTS),
    [snapshotIds],
  );

  const ready =
    ids.length >= MIN_MULTI_SNAPSHOTS && ids.length <= MAX_MULTI_SNAPSHOTS;
  const enabled =
    (options?.enabled ?? true) && !!clientId && !!budgetId && ready;

  const queries = useQueries({
    queries: ids.map((targetId) => ({
      queryKey: budgetQueryKeys.budgetComparison(
        clientId,
        budgetId ?? '',
        'snapshot',
        targetId,
      ),
      queryFn: () =>
        compareBudget(authFetch, budgetId!, 'snapshot', targetId),
      enabled,
      staleTime: STALE_MS,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = (queries.find((q) => q.isError)?.error ?? null) as Error | null;
  const allSuccess =
    queries.length === ids.length &&
    ids.length > 0 &&
    queries.every((q) => q.isSuccess && q.data);

  const data =
    allSuccess && queries.length > 0
      ? mergeLiveVsManySnapshotResponses(
          queries.map((q) => q.data as BudgetComparisonResponse),
        )
      : null;

  return {
    data,
    isLoading,
    isError,
    error,
    resolvedIds: ids,
    pendingCount: queries.filter((q) => q.isPending).length,
  };
}
