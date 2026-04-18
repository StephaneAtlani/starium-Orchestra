'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readRememberedClientId } from '@/lib/auth/remembered-client-id';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import type { MeClient } from '@/services/me';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

export default function SelectClientPage() {
  const router = useRouter();
  const { setActiveClient } = useActiveClient();
  const authenticatedFetch = useAuthenticatedFetch();
  const [clients, setClients] = useState<MeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { activeClientsSorted, rememberedId } = useMemo(() => {
    const list = clients.filter((c) => c.status === 'ACTIVE');
    const rid = readRememberedClientId();
    if (!rid) {
      return { activeClientsSorted: list, rememberedId: rid };
    }
    const sorted = [...list].sort((a, b) => {
      if (a.id === rid) return -1;
      if (b.id === rid) return 1;
      return 0;
    });
    return { activeClientsSorted: sorted, rememberedId: rid };
  }, [clients]);

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

  return (
    <Dialog open modal>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-xl shadow-lg border-border/80 p-0"
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sélectionner un client</CardTitle>
            <CardDescription>
              Choisissez l&apos;organisation avec laquelle vous souhaitez
              travailler. Vous pourrez en changer plus tard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Chargement des clients…
              </p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : activeClientsSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun client actif n&apos;est associé à votre compte. Contactez
                un administrateur.
              </p>
            ) : (
              <ul className="space-y-2" role="list" aria-label="Clients disponibles">
                {activeClientsSorted.map((client) => (
                  <li key={client.id}>
                    <Card
                      size="sm"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(client)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelect(client);
                        }
                      }}
                      className="w-full text-left cursor-pointer transition-colors hover:bg-accent hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {client.name}
                            </span>
                            {client.isDefault && (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
                                Par défaut
                              </span>
                            )}
                            {rememberedId === client.id && (
                              <Badge variant="secondary" className="text-[0.65rem] font-normal">
                                Dernière sélection
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {client.slug} ·{' '}
                            {client.role === 'CLIENT_ADMIN'
                              ? 'Administrateur'
                              : 'Utilisateur'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground"
                        >
                          Continuer
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
