'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';
import { readRememberedClientId } from '../../lib/auth/remembered-client-id';
import { resolveActiveClient } from '../../lib/auth/resolve-active-client';
import type { MeClient } from '../../services/me';
import { QueryProvider } from '../../providers/query-provider';
import { AppShell } from '../../components/shell/app-shell';
import { AppNotifications } from '../../components/notifications';

const BOOTSTRAP_FROM_LOGIN_KEY = 'starium.bootstrapFromLogin';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, accessToken } = useAuth();
  const { setActiveClient } = useActiveClient();
  const authenticatedFetch = useAuthenticatedFetch();
  const bootstrapDone = useRef(false);
  const [bootstrapResolved, setBootstrapResolved] = useState(false);
  const BOOTSTRAP_TIMEOUT_MS = 15_000;

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || bootstrapDone.current) return;

    // La page /select-client gère elle-même le chargement de /api/me/clients.
    if (pathname === '/select-client') {
      bootstrapDone.current = true;
      setBootstrapResolved(true);
      return;
    }

    // Routes plateforme / outils dev : ne dépendent pas du client actif.
    if (pathname.startsWith('/admin') || pathname.startsWith('/rbac-test')) {
      bootstrapDone.current = true;
      setBootstrapResolved(true);
      return;
    }

    // Juste après login : le client a déjà été résolu côté login, on l’applique sans refetch.
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(BOOTSTRAP_FROM_LOGIN_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { client?: MeClient };
          if (parsed?.client) {
            bootstrapDone.current = true;
            setActiveClient(parsed.client);
            setBootstrapResolved(true);
            window.sessionStorage.removeItem(BOOTSTRAP_FROM_LOGIN_KEY);
            return;
          }
        } catch {
          window.sessionStorage.removeItem(BOOTSTRAP_FROM_LOGIN_KEY);
        }
      }
    }

    if (!accessToken) return;

    const currentUser = user;
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      bootstrapDone.current = true;
      setBootstrapResolved(true);
    }, BOOTSTRAP_TIMEOUT_MS);

    async function runBootstrap() {
      bootstrapDone.current = true;
      try {
        const res = await authenticatedFetch('/api/me/clients');
        if (cancelled) return;
        clearTimeout(timeoutId);
        if (!res.ok) {
          setBootstrapResolved(true);
          return;
        }
        const clients = (await res.json()) as MeClient[];

        const storedActiveClientId =
          typeof window !== 'undefined' ? readRememberedClientId() : null;

        const resolution = resolveActiveClient(
          clients,
          currentUser.platformRole,
          storedActiveClientId,
        );

        if (resolution.type === 'redirect') {
          if (pathname !== resolution.to) {
            router.replace(resolution.to);
          }
          setBootstrapResolved(true);
          return;
        }
        if (resolution.type === 'blocked') {
          if (pathname !== '/no-client') {
            router.replace('/no-client');
          }
          setBootstrapResolved(true);
          return;
        }
        setActiveClient(resolution.client);
        if (pathname === '/select-client') {
          router.replace(resolution.to);
        }
      } catch {
        if (!cancelled) setBootstrapResolved(true);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setBootstrapResolved(true);
      }
    }

    void runBootstrap();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    isAuthenticated,
    isLoading,
    user,
    accessToken,
    authenticatedFetch,
    setActiveClient,
    router,
    pathname,
  ]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="starium-main min-h-screen flex items-center justify-center">
        <p className="starium-text-muted">Chargement…</p>
      </div>
    );
  }

  if (!bootstrapResolved) {
    return (
      <div className="starium-main min-h-screen flex items-center justify-center">
        <p className="starium-text-muted">Chargement…</p>
      </div>
    );
  }

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
      <AppNotifications />
    </QueryProvider>
  );
}
