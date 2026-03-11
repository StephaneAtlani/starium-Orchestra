'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  getMyClients,
  setDefaultClient,
  type MeClient,
} from '@/services/me';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AccountPage() {
  const { accessToken } = useAuth();
  const [clients, setClients] = useState<MeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyClients(accessToken);
      setClients(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');

  const handleSetDefault = async (clientId: string) => {
    if (!accessToken) return;
    setUpdatingId(clientId);
    setSuccess(null);
    setError(null);
    try {
      await setDefaultClient(accessToken, clientId);
      setSuccess('Client par défaut mis à jour.');
      await loadClients();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de définir le client par défaut');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Compte"
        description="Paramètres de votre compte et client par défaut."
      />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Client par défaut</h2>
          <p className="text-sm text-muted-foreground">
            Ce client sera utilisé par défaut à la prochaine connexion (sans
            modifier le client actif en cours).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && !clients.length && (
            <p className="text-sm text-muted-foreground">
              Chargement des clients…
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400" role="status">
              {success}
            </p>
          )}
          {!loading && activeClients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun client actif. Le client par défaut peut être défini lorsque
              vous êtes rattaché à au moins un client.
            </p>
          )}
          {!loading && activeClients.length > 0 && (
            <ul className="space-y-2">
              {activeClients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <span className="font-medium">{client.name}</span>
                  <div className="flex items-center gap-2">
                    {client.isDefault ? (
                      <Badge variant="secondary">Par défaut</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId !== null}
                        onClick={() => handleSetDefault(client.id)}
                      >
                        {updatingId === client.id
                          ? 'Mise à jour…'
                          : 'Définir par défaut'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
