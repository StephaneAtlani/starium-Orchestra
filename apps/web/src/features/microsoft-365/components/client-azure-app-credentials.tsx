'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

type ClientOAuthGet = {
  microsoftOAuthClientId: string | null;
  microsoftOAuthAuthorityTenant: string | null;
  microsoftOAuthRedirectUri: string | null;
  hasClientSecret: boolean;
  redirectUri: string | null;
  graphScopes: string;
};

async function describeClientMicrosoftOAuthLoadFailure(
  res: Response,
): Promise<string> {
  let apiMsg = '';
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (body?.message) {
      apiMsg = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
  } catch {
    /* corps non JSON */
  }
  switch (res.status) {
    case 401:
      return 'Session expirée. Reconnectez-vous.';
    case 403:
      return (
        apiMsg ||
        'Accès refusé : droits insuffisants (ex. permission « projets » en mise à jour), module Projets désactivé pour ce client, ou client actif manquant. Les administrateurs client ont accès sans cette permission.'
      );
    case 502:
    case 503:
      return 'Service API indisponible. Vérifiez que le backend est démarré.';
    default:
      if (res.status >= 500) {
        return apiMsg
          ? `${apiMsg} (voir les logs API.)`
          : 'Erreur serveur lors du chargement des identifiants Azure.';
      }
      return apiMsg || `Chargement impossible (HTTP ${res.status}).`;
  }
}

export function ClientAzureAppCredentials() {
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [tenant, setTenant] = useState('');
  const [secret, setSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [meta, setMeta] = useState<{
    graphScopes: string;
    hasClientSecret: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/clients/active/microsoft-oauth');
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Route identifiants Azure introuvable (404)', {
            description:
              'Redémarrez Nest ou reconstruisez le conteneur API. Vérifiez INTERNAL_API_URL / NEXT_PUBLIC_API_URL (docker-compose.dev.yml).',
          });
          return;
        }
        toast.error(await describeClientMicrosoftOAuthLoadFailure(res));
        return;
      }
      const data = (await res.json()) as ClientOAuthGet;
      setClientId(data.microsoftOAuthClientId ?? '');
      setTenant(data.microsoftOAuthAuthorityTenant ?? '');
      setRedirectUri(data.microsoftOAuthRedirectUri ?? data.redirectUri ?? '');
      setSecret('');
      setMeta({
        graphScopes: data.graphScopes,
        hasClientSecret: data.hasClientSecret,
      });
    } catch (e) {
      if (e instanceof TypeError) {
        toast.error(
          'Impossible de joindre l’API. Vérifiez que le backend tourne et que les rewrites Next ciblent la bonne URL.',
        );
      } else {
        toast.error('Impossible de charger les identifiants Azure.');
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/clients/active/microsoft-oauth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microsoftOAuthClientId: clientId || null,
          microsoftOAuthAuthorityTenant: tenant || null,
          microsoftOAuthRedirectUri: redirectUri || null,
          ...(secret.trim()
            ? { microsoftOAuthClientSecret: secret.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const raw = body?.message;
        const msg = Array.isArray(raw)
          ? raw.join(', ')
          : raw ?? 'Enregistrement refusé';
        throw new Error(msg);
      }
      toast.success('Identifiants enregistrés.');
      setSecret('');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-2xl border-border/70">
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des identifiants…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl border-border/70">
      <CardHeader>
        <CardTitle>Application Azure AD (Entra)</CardTitle>
        <CardDescription>
          ID d’application et secret de l’app enregistrée dans votre tenant
          Microsoft. Cette configuration est spécifique au client actif.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">Scopes attendus</p>
          <p className="mt-1 text-muted-foreground">
            <span className="font-mono text-xs">{meta?.graphScopes}</span>
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="azureClientId">ID d’application (client)</Label>
          <Input
            id="azureClientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="azureTenant">Tenant autorité (optionnel)</Label>
          <Input
            id="azureTenant"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="common"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="azureRedirectUri">URI de redirection OAuth</Label>
          <Input
            id="azureRedirectUri"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder="https://app.starium.fr/api/microsoft/auth/callback"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="azureSecret">Secret client</Label>
          <Input
            id="azureSecret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={
              meta?.hasClientSecret
                ? 'Laisser vide pour conserver le secret actuel'
                : 'Saisir le secret'
            }
            autoComplete="new-password"
          />
          {meta?.hasClientSecret && (
            <p className="text-xs text-muted-foreground">
              Un secret est déjà enregistré. Saisissez une valeur uniquement pour le remplacer.
            </p>
          )}
        </div>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer les identifiants
        </Button>
      </CardContent>
    </Card>
  );
}
