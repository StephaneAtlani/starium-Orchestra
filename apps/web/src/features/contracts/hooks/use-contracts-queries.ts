'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getContract, listContracts } from '../api/contracts.api';
import { contractsKeys } from '../lib/contracts-query-keys';

export function useContractsListQuery(
  params: {
    limit?: number;
    offset?: number;
    supplierId?: string;
    status?: string;
    expiresBefore?: string;
    search?: string;
  },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: contractsKeys.list(clientId, params),
    queryFn: () => listContracts(authFetch, params),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useContractDetailQuery(contractId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: contractsKeys.detail(clientId, contractId ?? ''),
    queryFn: () => getContract(authFetch, contractId!),
    enabled: Boolean(clientId && contractId),
  });
}
