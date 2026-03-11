import type { MeClient } from '../../services/me';

export type ActiveClientResolution =
  | { type: 'redirect'; to: '/admin/clients' | '/select-client' }
  | { type: 'blocked' }
  | { type: 'set-client'; client: MeClient; to: '/dashboard' };

/**
 * Résolution du client actif initial (bootstrap).
 * Une seule règle métier partagée par /login et (protected)/layout.
 * On ne considère que les clients avec status === 'ACTIVE'.
 */
export function resolveActiveClient(
  clients: MeClient[],
  platformRole: 'PLATFORM_ADMIN' | null,
  storedActiveClientId: string | null,
): ActiveClientResolution {
  const activeClients = clients.filter((c) => c.status === 'ACTIVE');

  if (activeClients.length === 0) {
    if (platformRole === 'PLATFORM_ADMIN') {
      return { type: 'redirect', to: '/admin/clients' };
    }
    return { type: 'blocked' };
  }

  if (storedActiveClientId) {
    const restored = activeClients.find((c) => c.id === storedActiveClientId);
    if (restored) {
      return { type: 'set-client', client: restored, to: '/dashboard' };
    }
  }

  const defaultClient = activeClients.find((c) => c.isDefault === true);
  if (defaultClient) {
    return { type: 'set-client', client: defaultClient, to: '/dashboard' };
  }

  if (activeClients.length === 1) {
    return { type: 'set-client', client: activeClients[0], to: '/dashboard' };
  }

  return { type: 'redirect', to: '/select-client' };
}
