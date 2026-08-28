'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getEnvelopeSummary } from '../api/budget-reporting.api';

export function useEnvelopeSummary(
  envelopeId: string | null,
  options?: { enabled?: boolean; includeChildren?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const includeChildren = options?.includeChildren ?? false;
  const enabled =
    (options?.enabled ?? true) && !!clientId && !!envelopeId;

  return useQuery({
    queryKey: budgetQueryKeys.envelopeSummary(
      clientId,
      envelopeId ?? '',
      includeChildren,
    ),
    queryFn: () =>
      getEnvelopeSummary(authFetch, envelopeId!, { includeChildren }),
    enabled,
  });
}
