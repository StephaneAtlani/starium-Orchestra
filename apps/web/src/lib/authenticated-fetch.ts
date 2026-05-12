import { getXClientIdHeaderValue } from './api-client';

function normalizeUrl(input: RequestInfo): string {
  if (typeof input === 'string') return input;
  return input.url;
}

function getApiBaseUrl(): string | null {
  if (typeof process === 'undefined') return null;
  return process.env.NEXT_PUBLIC_API_URL ?? null;
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

    const headerValue = getXClientIdHeaderValue(url, {
      activeClientId: getActiveClientId(),
      apiBaseUrl: getApiBaseUrl(),
    });
    if (!headers.has('X-Client-Id') && headerValue !== null) {
      headers.set('X-Client-Id', headerValue);
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
