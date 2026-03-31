'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getSuppliersDashboard } from '../api/procurement.api';
import type { SuppliersDashboardStats } from '../types/supplier.types';

export function suppliersDashboardQueryKey(clientId: string | undefined) {
  return ['procurement', clientId, 'suppliers-dashboard'] as const;
}

export function useSuppliersDashboardQuery(options?: { enabled?: boolean }) {
  const { activeClient, initialized } = useActiveClient();
  const authFetch = useAuthenticatedFetch();
  const clientId = activeClient?.id;
  const userEnabled = options?.enabled ?? true;

  return useQuery<SuppliersDashboardStats, Error>({
    queryKey: suppliersDashboardQueryKey(clientId),
    queryFn: () => getSuppliersDashboard(authFetch),
    enabled: initialized && Boolean(clientId) && userEnabled,
    staleTime: 30_000,
  });
}
