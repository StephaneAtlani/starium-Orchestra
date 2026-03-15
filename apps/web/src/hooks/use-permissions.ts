'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getMyPermissions } from '@/services/me';

const PERMISSIONS_QUERY_KEY = ['me', 'permissions'] as const;

/**
 * Hook générique : charge les codes de permission de l'utilisateur pour le client actif
 * et expose has(code) pour afficher/masquer des actions.
 */
export function usePermissions() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: [...PERMISSIONS_QUERY_KEY, clientId],
    queryFn: () => getMyPermissions(authFetch),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const permissionCodes = data?.permissionCodes ?? [];
  const set = useMemo(
    () => new Set(permissionCodes),
    [data?.permissionCodes],
  );

  const has = (code: string): boolean => set.has(code);

  return { permissionCodes, has, isLoading };
}
