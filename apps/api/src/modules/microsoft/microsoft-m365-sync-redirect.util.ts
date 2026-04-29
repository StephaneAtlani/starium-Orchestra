/** Chemin callback OAuth sync M365 (délégué), distinct du SSO `/api/auth/microsoft/callback`. */
export const M365_SYNC_OAUTH_CALLBACK_PATH = '/api/microsoft/auth/callback';

export type ResolveM365SyncRedirectResult =
  | { ok: true; uri: string }
  | { ok: false; message: string };

/**
 * URI de redirection OAuth **uniquement** pour la sync M365 projet.
 * Ne lit pas la config plateforme (réservée au SSO) : uniquement variables d’environnement API.
 */
export function resolveM365OAuthSyncRedirectUri(input: {
  envM365Sync?: string | null;
  envMicrosoftRedirect?: string | null;
}): ResolveM365SyncRedirectResult {
  const fromDedicated = input.envM365Sync?.trim();
  if (fromDedicated) return { ok: true, uri: fromDedicated };

  const legacy = input.envMicrosoftRedirect?.trim();
  if (legacy?.includes(M365_SYNC_OAUTH_CALLBACK_PATH)) {
    return { ok: true, uri: legacy };
  }

  return {
    ok: false,
    message:
      'URI de redirection sync M365 manquante : définir MICROSOFT_M365_SYNC_REDIRECT_URI sur l’API (ex. https://app.starium.fr/api/microsoft/auth/callback). Le flux sync n’utilise pas la redirect plateforme (SSO).',
  };
}
