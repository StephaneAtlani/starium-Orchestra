'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Cloud, Loader2 } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { ClientAzureAppCredentials } from './client-azure-app-credentials';

const QUERY_KEY = 'microsoft-connection';

type MicrosoftConnectionDto = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  status: string;
  tokenExpiresAt: string | null;
  connectedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function Microsoft365Settings() {
  const { activeClient } = useActiveClient();
  const {
    has,
    isLoading: permsLoading,
    isError: permsError,
  } = usePermissions();
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';
  /** Aligné sur `MicrosoftIntegrationAccessGuard` : admin client ou `projects.update` + module Projets (côté API). */
  const canUseMicrosoftIntegration =
    isClientAdmin ||
    (!permsLoading && !permsError && has('projects.update'));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, activeClient?.id],
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          (body as { message?: string })?.message ??
          'Impossible de charger la connexion Microsoft';
        throw new Error(msg);
      }
      return res.json() as Promise<{
        connection: MicrosoftConnectionDto | null;
      }>;
    },
    enabled: Boolean(activeClient?.id && canUseMicrosoftIntegration),
  });

  useEffect(() => {
    const m = searchParams.get('microsoft');
    if (m === 'connected') {
      void refetch();
      toast.success('Connexion Microsoft enregistrée.');
      window.history.replaceState({}, '', pathname);
    } else if (m === 'error') {
      toast.error('Échec ou annulation de la connexion Microsoft.');
      window.history.replaceState({}, '', pathname);
    }
  }, [searchParams, refetch, pathname]);

  const connect = useCallback(async () => {
    const res = await authFetch('/api/microsoft/auth/url');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { message?: string })?.message ??
          'Impossible de démarrer la connexion Microsoft',
      );
    }
    const json = (await res.json()) as { authorizationUrl: string };
    window.location.href = json.authorizationUrl;
  }, [authFetch]);

  const disconnect = useCallback(async () => {
    const res = await authFetch('/api/microsoft/connection', {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { message?: string })?.message ?? 'Déconnexion impossible',
      );
    }
    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEY, activeClient?.id],
    });
    toast.success('Connexion Microsoft révoquée.');
  }, [authFetch, queryClient, activeClient?.id]);

  const handleConnect = useCallback(() => {
    void connect().catch((e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Connexion impossible');
    });
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    void disconnect().catch((e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Déconnexion impossible');
    });
  }, [disconnect]);

  if (!activeClient) {
    return (
      <PageContainer>
        <Alert>
          <AlertTitle>Client requis</AlertTitle>
          <AlertDescription>
            Sélectionnez un client actif pour configurer Microsoft 365.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  if (!isClientAdmin) {
    if (permsLoading) {
      return (
        <PageContainer>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification des droits…
          </div>
        </PageContainer>
      );
    }
    if (permsError) {
      return (
        <PageContainer>
          <Alert variant="destructive">
            <AlertTitle>Impossible de charger les permissions</AlertTitle>
            <AlertDescription>
              Réessayez plus tard ou contactez un administrateur.
            </AlertDescription>
          </Alert>
        </PageContainer>
      );
    }
    if (!has('projects.update')) {
      return (
        <PageContainer>
          <Alert variant="destructive">
            <AlertTitle>Accès réservé</AlertTitle>
            <AlertDescription>
              La configuration Microsoft 365 requiert le rôle « Client admin » ou
              la permission{' '}
              <span className="font-mono text-xs">projects.update</span> avec le
              module Projets activé pour ce client.
            </AlertDescription>
          </Alert>
        </PageContainer>
      );
    }
  }

  const connection = data?.connection ?? null;

  return (
    <PageContainer>
      <PageHeader
        title="Microsoft 365"
        description="Connexion OAuth au tenant Microsoft du client actif (consentement administrateur ou utilisateur selon votre Azure AD). Chaque client Starium configure sa propre connexion."
      />

      <div className="space-y-6">
        <ClientAzureAppCredentials />

      <Card className="max-w-2xl border-border/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Intégration Microsoft 365</CardTitle>
              <CardDescription>
                Les jetons sont stockés uniquement côté serveur ; vous serez
                redirigé vers Microsoft pour le consentement.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement de l’état…
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Erreur inconnue'}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && connection && (
            <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Statut :</span>{' '}
                <span className="font-medium">{connection.status}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Tenant Microsoft :</span>{' '}
                <span className="font-mono text-xs">{connection.tenantId}</span>
              </p>
              {connection.tokenExpiresAt && (
                <p className="text-muted-foreground">
                  Jeton valide jusqu’au{' '}
                  {new Date(connection.tokenExpiresAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {!isLoading && !error && !connection && (
            <p className="text-sm text-muted-foreground">
              Aucune connexion Microsoft active pour ce client.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              onClick={handleConnect}
              disabled={isLoading}
            >
              {connection ? 'Reconnecter Microsoft 365' : 'Connecter Microsoft 365'}
            </Button>
            {connection && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnect}
              >
                Déconnecter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </PageContainer>
  );
}
