import {
  M365_SYNC_OAUTH_CALLBACK_PATH,
  resolveM365OAuthSyncRedirectUri,
} from './microsoft-m365-sync-redirect.util';

describe('resolveM365OAuthSyncRedirectUri', () => {
  it('priorise MICROSOFT_M365_SYNC_REDIRECT_URI', () => {
    const r = resolveM365OAuthSyncRedirectUri({
      envM365Sync: 'https://app.example/api/microsoft/auth/callback',
      platformRedirectUri: 'https://wrong/api/auth/microsoft/callback',
      envMicrosoftRedirect: null,
    });
    expect(r).toEqual({
      ok: true,
      uri: 'https://app.example/api/microsoft/auth/callback',
    });
  });

  it('refuse redirect plateforme si callback SSO', () => {
    const r = resolveM365OAuthSyncRedirectUri({
      envM365Sync: null,
      platformRedirectUri: 'https://app.example/api/auth/microsoft/callback',
      envMicrosoftRedirect: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('MICROSOFT_M365_SYNC_REDIRECT_URI');
  });

  it('accepte MICROSOFT_REDIRECT_URI legacy si chemin sync', () => {
    const r = resolveM365OAuthSyncRedirectUri({
      envM365Sync: null,
      platformRedirectUri: null,
      envMicrosoftRedirect: `https://x${M365_SYNC_OAUTH_CALLBACK_PATH}`,
    });
    expect(r).toEqual({ ok: true, uri: `https://x${M365_SYNC_OAUTH_CALLBACK_PATH}` });
  });
});
