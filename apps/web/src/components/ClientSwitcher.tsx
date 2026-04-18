import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LAST_SELECTED_CLIENT_ID_KEY } from '@/lib/auth/remembered-client-id';
import { useActiveClient } from '../hooks/use-active-client';
import type { MeClient } from '../services/me';

interface ClientSwitcherProps {
  accessToken: string;
  /** Classes sur le `<select>` (largeur max, typo responsive, etc.). */
  className?: string;
}

export function ClientSwitcher({ accessToken, className }: ClientSwitcherProps) {
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
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(LAST_SELECTED_CLIENT_ID_KEY);
            }
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
    return (
      <span className="text-xs text-muted-foreground whitespace-nowrap sm:text-sm">
        Chargement…
      </span>
    );
  }

  if (error) {
    return <span className="max-w-[10rem] truncate text-xs text-destructive sm:text-sm">{error}</span>;
  }

  if (!activeClients.length) {
    return <span className="text-xs text-muted-foreground sm:text-sm">Aucun client</span>;
  }

  return (
    <select
      value={activeClient?.id ?? ''}
      onChange={(e) => {
        const next = activeClients.find((c) => c.id === e.target.value) ?? null;
        setActiveClient(next);
      }}
      className={cn(
        'max-w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm',
        className,
      )}
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

