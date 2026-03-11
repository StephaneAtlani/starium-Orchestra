import { ActiveClient } from '../context/active-client-context';

export interface ApiClientOptions {
  accessToken?: string | null;
  activeClient?: ActiveClient | null;
}

export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {},
  options: ApiClientOptions,
) {
  const headers = new Headers(init.headers || {});

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  const url = typeof input === 'string' ? input : input.toString();

  const isMultiTenantRoute =
    url.startsWith('/api/users') ||
    url.startsWith('/api/projects') ||
    url.startsWith('/api/contracts') ||
    url.startsWith('/api/licenses') ||
    url.startsWith('/api/suppliers');

  const isExcludedRoute =
    url.startsWith('/api/auth/') ||
    url === '/api/me' ||
    url === '/api/me/clients' ||
    url === '/api/me/default-client' ||
    url.startsWith('/api/platform/');

  if (!isExcludedRoute && isMultiTenantRoute && options.activeClient?.id) {
    headers.set('X-Client-Id', options.activeClient.id);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  return response;
}

