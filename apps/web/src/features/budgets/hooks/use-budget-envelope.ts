'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgetEnvelopeDetail, listEnvelopeLines } from '../api/budget-management.api';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import type { PaginatedResponse } from '../types/budget-management.types';
import type { BudgetEnvelopeLineItem } from '../types/budget-envelope-detail.types';

export function useBudgetEnvelope(envelopeId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetEnvelopeDetail(clientId, envelopeId ?? ''),
    queryFn: () => getBudgetEnvelopeDetail(authFetch, envelopeId!),
    enabled: !!clientId && !!envelopeId,
  });
}

export function useBudgetEnvelopeLines(
  envelopeId: string | null,
  params: { offset: number; limit: number },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery<PaginatedResponse<BudgetEnvelopeLineItem>>({
    queryKey: budgetQueryKeys.budgetLines(clientId, envelopeId ?? '', params),
    queryFn: () => listEnvelopeLines(authFetch, envelopeId!, params),
    enabled: !!clientId && !!envelopeId,
    keepPreviousData: true,
  });
}

