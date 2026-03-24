'use client';

import { useActiveClient } from '@/hooks/use-active-client';
import { useMeClientsQuery } from '@/features/account/hooks/use-me-email-queries';
import type { MeDefaultEmailIdentity } from '@/services/me';

/**
 * E-mail par défaut pour le client actif (GET /me/clients, cache TanStack Query).
 */
export function useActiveClientEmailDisplay(): {
  identity: MeDefaultEmailIdentity | null;
  clientsLoaded: boolean;
} {
  const { activeClient } = useActiveClient();
  const { data: clients, isSuccess } = useMeClientsQuery();

  if (!activeClient?.id) {
    return { identity: null, clientsLoaded: false };
  }
  if (!isSuccess || !clients) {
    return { identity: null, clientsLoaded: false };
  }
  const row = clients.find((c) => c.id === activeClient.id);
  return {
    identity: row?.defaultEmailIdentity ?? null,
    clientsLoaded: true,
  };
}
