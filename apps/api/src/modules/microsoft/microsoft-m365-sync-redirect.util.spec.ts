import {
  M365_SYNC_OAUTH_CALLBACK_PATH,
  resolveM365OAuthSyncRedirectUri,
} from './microsoft-m365-sync-redirect.util';

describe('resolveM365OAuthSyncRedirectUri', () => {
  it('priorise MICROSOFT_M365_SYNC_REDIRECT_URI', () => {
    const r = resolveM365OAuthSyncRedirectUri({
      envM365Sync: 'https://app.example/api/microsoft/auth/callback',
      envMicrosoftRedirect: 'https://other/api/microsoft/auth/callback',
    });
    expect(r).toEqual({
      ok: true,
      uri: 'https://app.example/api/microsoft/auth/callback',
    });
  });

  it('n’utilise pas la plateforme : env dédiée absente → erreur claire', () => {
    const r = resolveM365OAuthSyncRedirectUri({
      envM365Sync: null,
      envMicrosoftRedirect: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('MICROSOFT_M365_SYNC_REDIRECT_URI');
  });

  it('accepte MICROSOFT_REDIRECT_URI legacy si chemin sync', () => {
    const r = resolveM365OAuthSyncRedirectUri({
      envM365Sync: null,
      envMicrosoftRedirect: `https://x${M365_SYNC_OAUTH_CALLBACK_PATH}`,
    });
    expect(r).toEqual({ ok: true, uri: `https://x${M365_SYNC_OAUTH_CALLBACK_PATH}` });
  });
});
