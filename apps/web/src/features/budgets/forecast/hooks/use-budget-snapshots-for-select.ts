'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { listBudgetSnapshots } from '@/features/budgets/api/budget-snapshots.api';

const STALE_MS = 45_000;

export function useBudgetSnapshotsForSelect(
  budgetId: string | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled =
    (options?.enabled ?? true) && !!clientId && !!budgetId;

  return useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId ?? ''),
    queryFn: () =>
      listBudgetSnapshots(authFetch, budgetId!, { limit: 100, offset: 0 }),
    enabled,
    staleTime: STALE_MS,
  });
}
