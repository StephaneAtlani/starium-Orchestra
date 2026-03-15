import { ActiveClient } from '../context/active-client-context';

export interface ApiClientOptions {
  accessToken?: string | null;
  activeClient?: ActiveClient | null;
}

/**
 * Routes pour lesquelles X-Client-Id ne doit pas être envoyé (pas de contexte client requis).
 * Documenter ici toute nouvelle exclusion.
 */
const EXCLUDED_API_PATHS: { prefix?: string; exact?: string }[] = [
  { prefix: '/api/auth/' },
  { exact: '/api/me' },
  { exact: '/api/me/clients' },
  { exact: '/api/me/default-client' },
  { prefix: '/api/platform/' },
  { prefix: '/api/clients' },
];

function isExcludedApiRoute(path: string): boolean {
  const normalized = path.split('?')[0].split('#')[0];
  for (const rule of EXCLUDED_API_PATHS) {
    if (rule.exact && normalized === rule.exact) return true;
    if (rule.prefix && normalized.startsWith(rule.prefix)) return true;
  }
  return false;
}

/**
 * Détermine si le header X-Client-Id doit être envoyé pour cette URL.
 * Retourne la valeur à envoyer (activeClientId) ou null si le header ne doit pas être ajouté.
 */
export function getXClientIdHeaderValue(
  url: string,
  options: {
    activeClientId?: string | null;
    apiBaseUrl?: string | null;
  },
): string | null {
  const { activeClientId, apiBaseUrl } = options;

  // Extraire le path (sans query ni hash)
  let path: string;
  const isAbsolute =
    url.startsWith('http://') || url.startsWith('https://');
  if (isAbsolute) {
    try {
      path = new URL(url).pathname;
    } catch {
      path = url.split('?')[0].split('#')[0];
    }
  } else {
    path = url.split('?')[0].split('#')[0];
  }

  // URL absolue sans apiBaseUrl → ne jamais envoyer vers l'extérieur
  if (isAbsolute && !apiBaseUrl) {
    return null;
  }

  // URL absolue avec apiBaseUrl : vérifier que l'URL appartient à notre API
  if (isAbsolute && apiBaseUrl) {
    const base = apiBaseUrl.replace(/\/$/, '');
    if (url !== base && !url.startsWith(base + '/') && !url.startsWith(base + '?')) {
      return null;
    }
  }

  // Path ne commence pas par /api/ → pas de header
  if (!path.startsWith('/api/')) {
    return null;
  }

  // Route exclue
  if (isExcludedApiRoute(path)) {
    return null;
  }

  // Pas de client actif
  if (!activeClientId || activeClientId.trim() === '') {
    return null;
  }

  return activeClientId;
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
  const apiBaseUrl =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL ?? null
      : null;
  const headerValue = getXClientIdHeaderValue(url, {
    activeClientId: options.activeClient?.id,
    apiBaseUrl,
  });
  if (headerValue !== null) {
    headers.set('X-Client-Id', headerValue);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  return response;
}
