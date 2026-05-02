'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getMyPermissions } from '@/services/me';

/** Clé partagée pour invalider le cache après changement de rôles (ex. client RBAC). */
export const PERMISSIONS_QUERY_KEY = ['me', 'permissions'] as const;

/**
 * Hook générique : charge les codes de permission de l'utilisateur pour le client actif
 * et expose has(code) pour afficher/masquer des actions.
 */
export function usePermissions() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data, isLoading, isSuccess, isError } = useQuery({
    queryKey: [...PERMISSIONS_QUERY_KEY, clientId],
    queryFn: () => getMyPermissions(authFetch),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const permissionCodes = useMemo(
    () => data?.permissionCodes ?? [],
    [data?.permissionCodes],
  );
  const set = useMemo(() => new Set(permissionCodes), [permissionCodes]);

  const has = (code: string): boolean => set.has(code);

  return {
    permissionCodes,
    has,
    isLoading,
    /** True only after a successful GET /me/permissions for le client actif (requis pour la nav filtrée). */
    isSuccess,
    isError,
  };
}
