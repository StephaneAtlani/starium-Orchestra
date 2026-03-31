'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

/** Valeurs affichées par défaut en local si la plateforme n’a pas encore d’URL succès/erreur en base. */
const DEFAULT_OAUTH_SUCCESS_ERROR_URL =
  'http://localhost:3000/client/administration/microsoft-365';

type PlatformMicrosoftGetResponse = {
  stored: {
    ssoOAuthClientId?: string | null;
    ssoOAuthAuthorityTenant?: string | null;
    hasSsoClientSecret?: boolean;
  } | null;
  resolved: {
    redirectUri: string | null;
    graphScopes: string;
    oauthSuccessUrl: string | null;
    oauthErrorUrl: string | null;
    oauthStateTtlSeconds: number;
    refreshLeewaySeconds: number;
    tokenHttpTimeoutMs: number;
  };
};

async function describePlatformMicrosoftLoadFailure(res: Response): Promise<string> {
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
        'Accès refusé : droits administrateur plateforme requis. Si le rôle vient d’être attribué, déconnectez-vous puis reconnectez-vous pour rafraîchir le jeton.'
      );
    case 502:
    case 503:
      return 'Service API indisponible. Vérifiez que le backend est démarré.';
    default:
      if (res.status >= 500) {
        return apiMsg
          ? `${apiMsg} (vérifiez les migrations Prisma et les logs API.)`
          : 'Erreur serveur. Vérifiez que la migration Prisma pour PlatformMicrosoftSettings est appliquée et consultez les logs du backend.';
      }
      return apiMsg || `Chargement impossible (HTTP ${res.status}).`;
  }
}

export function PlatformMicrosoftSettingsForm() {
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    redirectUri: '',
    graphScopes: '',
    oauthSuccessUrl: '',
    oauthErrorUrl: '',
    oauthStateTtlSeconds: '',
    refreshLeewaySeconds: '',
    tokenHttpTimeoutMs: '',
    ssoOAuthClientId: '',
    ssoOAuthClientSecret: '',
    ssoOAuthAuthorityTenant: '',
  });
  const [hasSsoClientSecretStored, setHasSsoClientSecretStored] = useState(false);
  const [removeSsoSecret, setRemoveSsoSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/platform/microsoft-settings');
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Route Microsoft plateforme introuvable (404)', {
            description:
              'Redémarrez Nest ou reconstruisez api-dev. Voir docker-compose.dev.yml : INTERNAL_API_URL (API côté conteneur), NEXT_PUBLIC_API_URL (navigateur).',
          });
          return;
        }
        toast.error(await describePlatformMicrosoftLoadFailure(res));
        return;
      }
      const data = (await res.json()) as PlatformMicrosoftGetResponse;
      const r = data.resolved;
      const s = data.stored;
      setHasSsoClientSecretStored(Boolean(s?.hasSsoClientSecret));
      setRemoveSsoSecret(false);
      setForm({
        redirectUri: r.redirectUri ?? '',
        graphScopes: r.graphScopes ?? '',
        oauthSuccessUrl:
          r.oauthSuccessUrl?.trim() || DEFAULT_OAUTH_SUCCESS_ERROR_URL,
        oauthErrorUrl:
          r.oauthErrorUrl?.trim() || DEFAULT_OAUTH_SUCCESS_ERROR_URL,
        oauthStateTtlSeconds: String(r.oauthStateTtlSeconds ?? ''),
        refreshLeewaySeconds: String(r.refreshLeewaySeconds ?? ''),
        tokenHttpTimeoutMs: String(r.tokenHttpTimeoutMs ?? ''),
        ssoOAuthClientId: s?.ssoOAuthClientId ?? '',
        ssoOAuthClientSecret: '',
        ssoOAuthAuthorityTenant: s?.ssoOAuthAuthorityTenant ?? '',
      });
    } catch (e) {
      if (e instanceof TypeError) {
        toast.error(
          'Impossible de joindre l’API. Vérifiez que le backend est démarré et que les rewrites Next (INTERNAL_API_URL) ciblent la bonne URL.',
        );
      } else {
        toast.error(
          'Impossible de charger la configuration Microsoft plateforme.',
        );
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
      const res = await authFetch('/api/platform/microsoft-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirectUri: form.redirectUri || null,
          graphScopes: form.graphScopes || null,
          oauthSuccessUrl: form.oauthSuccessUrl || null,
          oauthErrorUrl: form.oauthErrorUrl || null,
          oauthStateTtlSeconds: form.oauthStateTtlSeconds
            ? parseInt(form.oauthStateTtlSeconds, 10)
            : null,
          refreshLeewaySeconds: form.refreshLeewaySeconds
            ? parseInt(form.refreshLeewaySeconds, 10)
            : null,
          tokenHttpTimeoutMs: form.tokenHttpTimeoutMs
            ? parseInt(form.tokenHttpTimeoutMs, 10)
            : null,
          ssoOAuthClientId: form.ssoOAuthClientId.trim() || null,
          ssoOAuthAuthorityTenant: form.ssoOAuthAuthorityTenant.trim() || null,
          ...(form.ssoOAuthClientSecret.trim()
            ? { ssoOAuthClientSecret: form.ssoOAuthClientSecret }
            : removeSsoSecret
              ? { ssoOAuthClientSecret: '' }
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
      toast.success('Configuration enregistrée.');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Microsoft 365 — plateforme"
        description="Paramètres OAuth communs, puis identifiants Entra pour le login SSO (tous les clients). Les apps Azure par client pour Teams/Planner restent dans l’administration client."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Paramètres OAuth communs</CardTitle>
          <CardDescription>
            Valeurs fusionnées avec les variables d’environnement si un champ est vide en base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="redirectUri">URI de redirection (callback Starium)</Label>
            <Input
              id="redirectUri"
              value={form.redirectUri}
              onChange={(e) =>
                setForm((f) => ({ ...f, redirectUri: e.target.value }))
              }
              placeholder="https://…/api/microsoft/auth/callback"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graphScopes">Scopes Microsoft Graph</Label>
            <Input
              id="graphScopes"
              value={form.graphScopes}
              onChange={(e) =>
                setForm((f) => ({ ...f, graphScopes: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oauthSuccessUrl">URL succès (optionnel)</Label>
              <Input
                id="oauthSuccessUrl"
                value={form.oauthSuccessUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, oauthSuccessUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauthErrorUrl">URL erreur (optionnel)</Label>
              <Input
                id="oauthErrorUrl"
                value={form.oauthErrorUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, oauthErrorUrl: e.target.value }))
                }
              />
            </div>
          </div>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SSO utilisateur (connexion Microsoft)</CardTitle>
              <CardDescription>
                Application Entra unique pour le login « Se connecter avec Microsoft ». Priorité : variables
                d’environnement <code className="text-xs">MICROSOFT_CLIENT_ID</code> /{' '}
                <code className="text-xs">MICROSOFT_CLIENT_SECRET</code> sur l’API ; sinon ces champs.
                Enregistrez dans Entra une redirect URI vers{' '}
                <code className="text-xs">…/api/auth/microsoft/callback</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ssoOAuthClientId">ID d’application (client) Entra — SSO</Label>
                <Input
                  id="ssoOAuthClientId"
                  value={form.ssoOAuthClientId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ssoOAuthClientId: e.target.value }))
                  }
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssoOAuthClientSecret">Secret client — SSO</Label>
                <Input
                  id="ssoOAuthClientSecret"
                  type="password"
                  value={form.ssoOAuthClientSecret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ssoOAuthClientSecret: e.target.value }))
                  }
                  placeholder={
                    hasSsoClientSecretStored
                      ? 'Laisser vide pour conserver le secret actuel'
                      : 'Coller le secret (valeur)'
                  }
                  autoComplete="new-password"
                />
                {hasSsoClientSecretStored && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={removeSsoSecret}
                      onChange={(e) => setRemoveSsoSecret(e.target.checked)}
                    />
                    Supprimer le secret enregistré
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssoOAuthAuthorityTenant">Tenant OAuth (optionnel)</Label>
                <Input
                  id="ssoOAuthAuthorityTenant"
                  value={form.ssoOAuthAuthorityTenant}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ssoOAuthAuthorityTenant: e.target.value,
                    }))
                  }
                  placeholder="common ou GUID du tenant"
                />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="oauthStateTtlSeconds">TTL state (s)</Label>
              <Input
                id="oauthStateTtlSeconds"
                type="number"
                value={form.oauthStateTtlSeconds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    oauthStateTtlSeconds: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refreshLeewaySeconds">Marge refresh (s)</Label>
              <Input
                id="refreshLeewaySeconds"
                type="number"
                value={form.refreshLeewaySeconds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    refreshLeewaySeconds: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenHttpTimeoutMs">Timeout token HTTP (ms)</Label>
              <Input
                id="tokenHttpTimeoutMs"
                type="number"
                value={form.tokenHttpTimeoutMs}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tokenHttpTimeoutMs: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
