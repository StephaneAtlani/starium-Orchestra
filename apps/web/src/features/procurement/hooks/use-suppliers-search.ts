'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listSuppliers } from '../api/procurement.api';

export function useSuppliersSearch(search: string, enabled = true) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: ['procurement', clientId, 'suppliers', search],
    queryFn: () =>
      listSuppliers(authFetch, {
        search,
        limit: 10,
        offset: 0,
      }),
    enabled: enabled && !!clientId && search.trim().length > 0,
  });
}

