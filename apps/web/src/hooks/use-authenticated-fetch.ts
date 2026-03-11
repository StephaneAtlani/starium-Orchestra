'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { useActiveClient } from './use-active-client';
import { createAuthenticatedFetch } from '../lib/authenticated-fetch';

/**
 * Hook retournant un fetch authentifié : Authorization, X-Client-Id (contrat strict),
 * sur 401 un seul refresh puis retry ; si échec → clear session + redirect /login.
 */
export function useAuthenticatedFetch(): (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response> {
  const { accessToken, refreshSession, logout } = useAuth();
  const { activeClient } = useActiveClient();
  const router = useRouter();

  const clearSessionAndRedirect = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  return useMemo(
    () =>
      createAuthenticatedFetch({
        getAccessToken: () => accessToken,
        refreshSession,
        clearSessionAndRedirect,
        getActiveClientId: () => activeClient?.id ?? null,
      }),
    [
      accessToken,
      refreshSession,
      clearSessionAndRedirect,
      activeClient?.id,
    ],
  );
}
