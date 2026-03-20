'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listSuppliers } from '../api/procurement.api';

const DEBOUNCE_MS = 280;

/**
 * Liste fournisseurs pour dropdown (recherche optionnelle, fetch même si search vide).
 */
export function useSuppliersDropdownQuery(search: string, enabled: boolean) {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: ['procurement', clientId, 'suppliers-dropdown', debounced],
    queryFn: () =>
      listSuppliers(authFetch, {
        search: debounced.trim() || undefined,
        limit: 40,
        offset: 0,
      }),
    enabled: enabled && !!clientId,
    staleTime: 20_000,
  });
}
