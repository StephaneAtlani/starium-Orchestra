import React, { useEffect, useState } from 'react';
import { useActiveClient } from '../hooks/use-active-client';
import type { MeClient } from '../services/me';

interface ClientSwitcherProps {
  accessToken: string;
}

export function ClientSwitcher({ accessToken }: ClientSwitcherProps) {
  const { activeClient, setActiveClient, initialized } = useActiveClient();
  const [clients, setClients] = useState<MeClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized || !accessToken) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/me/clients', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) {
          throw new Error('Erreur lors du chargement des clients');
        }
        const data = (await res.json()) as MeClient[];
        if (cancelled) return;
        setClients(data);

        const activeClients = data.filter((c) => c.status === 'ACTIVE');

        // si un client actif est déjà stocké, on le valide
        if (activeClient) {
          const match = activeClients.find((c) => c.id === activeClient.id);
          if (!match) {
            setActiveClient(null);
          }
          return;
        }

        // sinon auto-sélection si un seul client ACTIVE
        if (activeClients.length === 1) {
          setActiveClient(activeClients[0]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Erreur inattendue côté client',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [accessToken, activeClient, initialized, setActiveClient]);

  if (!initialized) return null;

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');

  if (loading && !clients.length) {
    return <span>Chargement des clients…</span>;
  }

  if (error) {
    return <span>Erreur chargement clients : {error}</span>;
  }

  if (!activeClients.length) {
    return <span>Aucun client actif disponible</span>;
  }

  return (
    <select
      value={activeClient?.id ?? ''}
      onChange={(e) => {
        const next = activeClients.find((c) => c.id === e.target.value) ?? null;
        setActiveClient(next);
      }}
    >
      <option value="" disabled>
        Sélectionner un client…
      </option>
      {activeClients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}

