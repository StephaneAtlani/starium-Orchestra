/**
 * Routes sur lesquelles on ne doit jamais envoyer X-Client-Id.
 * Règle centralisée (RFC-014-2).
 */
function shouldSendClientId(url: string): boolean {
  const path = url.split('?')[0];
  if (path.startsWith('/api/auth/')) return false;
  if (path === '/api/me' || path === '/api/me/clients' || path === '/api/me/default-client') return false;
  if (path.startsWith('/api/platform/')) return false;
  if (path === '/api/clients' || path.startsWith('/api/clients/')) return false;
  return true;
}

function normalizeUrl(input: RequestInfo): string {
  if (typeof input === 'string') return input;
  return input.url;
}

export interface AuthenticatedFetchOptions {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<string | null>;
  clearSessionAndRedirect: () => void;
  getActiveClientId: () => string | null;
}

/**
 * Crée une fonction fetch authentifiée : Authorization, X-Client-Id (selon contrat),
 * sur 401 : un seul refresh puis retry ; si échec → clear session + redirect.
 */
export function createAuthenticatedFetch(
  options: AuthenticatedFetchOptions,
): (input: RequestInfo, init?: RequestInit) => Promise<Response> {
  const {
    getAccessToken,
    refreshSession,
    clearSessionAndRedirect,
    getActiveClientId,
  } = options;

  return async function authenticatedFetch(
    input: RequestInfo,
    init: RequestInit = {},
  ): Promise<Response> {
    const url = normalizeUrl(input);
    const headers = new Headers(init.headers ?? {});

    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (shouldSendClientId(url)) {
      const clientId = getActiveClientId();
      if (clientId) {
        headers.set('X-Client-Id', clientId);
      }
    }

    let response = await fetch(input, { ...init, headers });

    if (response.status === 401 && token) {
      const newToken = await refreshSession();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(input, { ...init, headers });
      }
      if (response.status === 401) {
        clearSessionAndRedirect();
      }
    }

    return response;
  };
}
