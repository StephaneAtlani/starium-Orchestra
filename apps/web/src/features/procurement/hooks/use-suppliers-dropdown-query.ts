'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listSuppliers } from '../api/procurement.api';

const DEBOUNCE_MS = 280;

/**
 * Liste fournisseurs pour dropdown (gating >= 2 caractères).
 * Note: la cohérence UI en dessous de 2 caractères est gérée côté combobox (pas via React Query data persistante).
 */
export function useSuppliersDropdownQuery(
  search: string,
  enabled: boolean,
  minChars = 2,
) {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const normalizedQuery = debounced.trim().replace(/\s+/g, ' ');

  return useQuery({
    queryKey: ['procurement', clientId, 'suppliers-dropdown', normalizedQuery, minChars],
    queryFn: () =>
      listSuppliers(authFetch, {
        search: normalizedQuery || undefined,
        limit: 40,
        offset: 0,
      }),
    enabled: enabled && !!clientId && normalizedQuery.length >= minChars,
    staleTime: 20_000,
  });
}
