'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getPlatformClientUsers } from '../api/licenses-cockpit';
import { licensesCockpitKeys } from '../query-keys';

/**
 * RFC-ACL-010 — liste des membres + licences d'un client (cockpit plateforme).
 * Consomme exclusivement `GET /api/platform/clients/:clientId/users`.
 */
export function usePlatformClientUsers(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: licensesCockpitKeys.platformClientUsers(clientId),
    queryFn: () => getPlatformClientUsers(authFetch, clientId),
    enabled: !!clientId,
  });
}
