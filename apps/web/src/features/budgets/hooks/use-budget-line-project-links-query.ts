'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { listBudgetLineProjectLinks } from '../api/budget-project-links.api';

export function useBudgetLineProjectLinksQuery(
  budgetLineId: string | null,
  options?: { enabled?: boolean; limit?: number; offset?: number },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const enabled = (options?.enabled ?? true) && !!clientId && !!budgetLineId;

  return useQuery({
    queryKey: budgetQueryKeys.budgetLineProjectLinks(clientId, budgetLineId ?? '', {
      limit,
      offset,
    }),
    queryFn: () =>
      listBudgetLineProjectLinks(authFetch, budgetLineId!, { limit, offset }),
    enabled,
  });
}
