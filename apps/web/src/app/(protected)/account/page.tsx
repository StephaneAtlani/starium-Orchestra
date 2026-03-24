'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccountProfileSection } from '@/features/account/components/account-profile-section';
import { AccountSecuritySection } from '@/features/account/components/account-security-section';
import { AccountEmailIdentitiesSection } from '@/features/account/components/account-email-identities-section';
import { AccountClientDefaultEmailSection } from '@/features/account/components/account-client-default-email-section';
import {
  useMeClientsQuery,
  useSetDefaultClientMutation,
} from '@/features/account/hooks/use-me-email-queries';

export default function AccountPage() {
  const { data: clients, isLoading, error, refetch } = useMeClientsQuery();
  const setDefaultMut = useSetDefaultClientMutation();
  const [success, setSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const clientList = clients ?? [];
  const activeClients = clientList.filter((c) => c.status === 'ACTIVE');

  const handleSetDefault = async (clientId: string) => {
    setSuccess(null);
    setLocalError(null);
    try {
      await setDefaultMut.mutateAsync(clientId);
      setSuccess('Client par défaut mis à jour.');
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : 'Impossible de définir le client par défaut',
      );
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Compte"
        description="Paramètres de votre compte, adresses e-mail et client par défaut."
      />

      <AccountProfileSection />

      <AccountSecuritySection />

      <AccountEmailIdentitiesSection />

      <AccountClientDefaultEmailSection />

      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>Client par défaut</CardTitle>
          <CardDescription>
            Utilisé à la prochaine connexion pour pré-sélectionner un client
            (sans changer le client actif de la session en cours).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 px-0 pt-0">
          {isLoading && clientList.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chargement des clients…
            </p>
          )}
          {(error || localError) && (
            <div
              className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3"
              role="alert"
            >
              <span className="text-sm text-destructive">
                {localError ??
                  (error instanceof Error
                    ? error.message
                    : 'Erreur de chargement')}
              </span>
              {error && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  Réessayer
                </Button>
              )}
            </div>
          )}
          {success && (
            <p
              className="border-b border-border/60 px-4 py-3 text-sm text-green-600 dark:text-green-500"
              role="status"
            >
              {success}
            </p>
          )}
          {!isLoading && activeClients.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun client actif. Le client par défaut peut être défini lorsque
              vous êtes rattaché à au moins un client.
            </p>
          )}
          {!isLoading && activeClients.length > 0 && (
            <ul className="divide-y divide-border/50">
              {activeClients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {client.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {client.isDefault ? (
                      <Badge variant="secondary" className="font-normal">
                        Par défaut
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-foreground"
                        disabled={setDefaultMut.isPending}
                        onClick={() => void handleSetDefault(client.id)}
                      >
                        {setDefaultMut.isPending
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
