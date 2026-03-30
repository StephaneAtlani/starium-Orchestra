'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { compareSnapshots } from '@/features/budgets/api/budget-comparison.api';

const STALE_MS = 45_000;

export function useSnapshotPairComparison(
  leftId: string | undefined,
  rightId: string | undefined,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const ready =
    !!leftId?.trim() &&
    !!rightId?.trim() &&
    leftId !== rightId;
  const enabled = (options?.enabled ?? true) && !!clientId && ready;

  return useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotPairComparison(
      clientId,
      leftId ?? '',
      rightId ?? '',
    ),
    queryFn: () => compareSnapshots(authFetch, leftId!, rightId!),
    enabled,
    staleTime: STALE_MS,
  });
}
