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
import { readApiErrorMessageFromResponse } from '@/lib/read-api-error-message';
import { ClientAzureAppCredentials } from './client-azure-app-credentials';

const QUERY_KEY = 'microsoft-connection';
const OAUTH_META_QUERY_KEY = 'client-microsoft-oauth';

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

type ClientOAuthMeta = {
  syncRedirectUri: string | null;
  syncRedirectUriError: string | null;
  graphScopes: string;
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
        throw new Error(
          (await readApiErrorMessageFromResponse(res)) ||
            'Impossible de charger la connexion Microsoft',
        );
      }
      return res.json() as Promise<{
        connection: MicrosoftConnectionDto | null;
      }>;
    },
    enabled: Boolean(activeClient?.id && canUseMicrosoftIntegration),
  });

  const { data: oauthMeta } = useQuery({
    queryKey: [OAUTH_META_QUERY_KEY, activeClient?.id],
    queryFn: async () => {
      const res = await authFetch('/api/clients/active/microsoft-oauth');
      if (!res.ok) {
        throw new Error(
          (await readApiErrorMessageFromResponse(res)) ||
            'Impossible de charger l’URL de callback',
        );
      }
      return res.json() as Promise<ClientOAuthMeta>;
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
      throw new Error(
        (await readApiErrorMessageFromResponse(res)) ||
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
      throw new Error(
        (await readApiErrorMessageFromResponse(res)) || 'Déconnexion impossible',
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
        description="Synchronisation Teams, Planner et fichiers : configurez une application Microsoft Entra dans votre tenant, puis reliez-la à Orchestra."
      />

      <div className="space-y-6">
        <Card className="max-w-2xl border-border/70">
          <CardHeader>
            <CardTitle>Configurer votre Microsoft 365</CardTitle>
            <CardDescription>
              Étapes à réaliser dans le centre d’administration Microsoft Entra de votre
              organisation pour autoriser Orchestra à accéder à Teams, Planner et aux fichiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <ol className="list-decimal space-y-3 pl-5 marker:text-foreground">
              <li>
                <span className="font-medium text-foreground">Inscription d’application</span>{' '}
                — Dans{' '}
                <a
                  href="https://entra.microsoft.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Microsoft Entra
                </a>{' '}
                → <strong>Applications</strong> → <strong>Inscriptions d’applications</strong>,
                créez une application dédiée à Orchestra (ou ouvrez celle existante). À
                l’inscription, dans <strong>URI de redirection</strong>, sélectionnez le mode{' '}
                <strong>Web</strong> et collez l’URL de callback ci-dessous — caractère pour
                caractère, sans espace ni slash final superflu. Si l’application existe déjà,
                ajoutez la même URI sous <strong>Authentification</strong> → plateforme{' '}
                <strong>Web</strong> :
                <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
                  {oauthMeta?.syncRedirectUriError != null ? (
                    <p className="text-sm text-destructive">{oauthMeta.syncRedirectUriError}</p>
                  ) : oauthMeta?.syncRedirectUri ? (
                    <p className="break-all font-mono text-xs text-foreground">
                      {oauthMeta.syncRedirectUri}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Chargement de l’URL…</p>
                  )}
                </div>
                Choisissez le type de comptes pris en charge :
                <ul className="mt-2 list-disc pl-5">
                  <li>
                    <strong>Mon organisation uniquement</strong> (single-tenant) — recommandé pour
                    limiter l’accès à votre annuaire.
                  </li>
                  <li>
                    <strong>Comptes dans n’importe quel annuaire organisationnel</strong>{' '}
                    (multi-tenant) — si plusieurs organisations doivent s’authentifier via la même
                    application.
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-medium text-foreground">Identifiants</span> — Sur la page de
                l’application, copiez l’<strong>ID d’application (client)</strong>. Sous{' '}
                <strong>Certificats et secrets</strong>, créez un <strong>secret client</strong> et
                copiez immédiatement sa <strong>valeur</strong> (colonne « Valeur », pas l’ID du
                secret — affichée une seule fois).
              </li>
              <li>
                <span className="font-medium text-foreground">URI de redirection</span> — Si ce
                n’est pas déjà fait à l’inscription, sous <strong>Authentification</strong>,
                ajoutez la plateforme <strong>Web</strong> et vérifiez que l’URI correspond
                exactement à l’URL de callback de l’étape 1.
              </li>
              <li>
                <span className="font-medium text-foreground">Permissions Microsoft Graph</span>{' '}
                — Sous <strong>Autorisations API</strong>, ajoutez les permissions{' '}
                <strong>Microsoft Graph</strong> correspondant aux scopes suivants
                {oauthMeta?.graphScopes ? (
                  <>
                    {' '}
                    :{' '}
                    <span className="font-mono text-xs text-foreground">
                      {oauthMeta.graphScopes}
                    </span>
                  </>
                ) : (
                  ' (voir le bloc ci-dessous)'
                )}
                . Accordez ensuite le <strong>consentement administrateur</strong> pour votre
                organisation.
              </li>
              <li>
                <span className="font-medium text-foreground">ID de tenant</span> — Si
                l’application est single-tenant, notez l’<strong>ID de tenant (GUID)</strong>{' '}
                depuis la vue d’ensemble d’Entra ; vous le renseignerez dans Orchestra avec l’ID
                d’application et la valeur du secret.
              </li>
            </ol>
            <p className="border-t border-border pt-3 text-xs">
              En cas d’erreur sur l’<em>redirect_uri</em> ou le tenant : vérifiez que l’URI
              déclarée dans Entra correspond exactement à celle affichée ci-dessous, et que le
              type de comptes (single-tenant / multi-tenant) est cohérent avec votre configuration.
            </p>
          </CardContent>
        </Card>

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
                Après configuration de votre app Entra (ci-dessus), le consentement s’effectue
                chez Microsoft ; les jetons restent chiffrés côté serveur Starium pour ce client.
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
