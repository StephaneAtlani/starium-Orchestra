'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import type { MeClient } from '@/services/me';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SelectClientPage() {
  const router = useRouter();
  const { setActiveClient } = useActiveClient();
  const authenticatedFetch = useAuthenticatedFetch();
  const [clients, setClients] = useState<MeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authenticatedFetch('/api/me/clients');
        if (cancelled) return;
        if (!res.ok) {
          setError('Impossible de charger la liste des clients');
          return;
        }
        const data = (await res.json()) as MeClient[];
        setClients(data.filter((c) => c.status === 'ACTIVE'));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch]);

  function handleSelect(client: MeClient) {
    setActiveClient(client);
    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <p className="text-muted-foreground">Chargement des clients…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Choisir un client</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sélectionnez le client avec lequel vous souhaitez travailler.
        </p>
      </div>
      <div className="grid gap-3">
        {clients.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                Aucun client actif disponible.
              </p>
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handleSelect(client)}
            >
              <CardHeader className="py-4">
                <CardTitle className="text-base">{client.name}</CardTitle>
                <p className="text-muted-foreground text-sm">{client.slug}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button size="sm">Continuer</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
