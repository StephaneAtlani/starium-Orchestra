'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';
import { resolveActiveClient } from '../../lib/auth/resolve-active-client';
import type { MeClient } from '../../services/me';
import { QueryProvider } from '../../providers/query-provider';
import { AppShell } from '../../components/shell/app-shell';

const ACTIVE_CLIENT_KEY = 'starium.activeClient';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeClient, setActiveClient, initialized } = useActiveClient();
  const authenticatedFetch = useAuthenticatedFetch();
  const bootstrapDone = useRef(false);
  const [bootstrapResolved, setBootstrapResolved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || bootstrapDone.current) return;

    const currentUser = user;
    let cancelled = false;

    async function runBootstrap() {
      bootstrapDone.current = true;
      try {
        const res = await authenticatedFetch('/api/me/clients');
        if (cancelled) return;
        if (!res.ok) {
          setBootstrapResolved(true);
          return;
        }
        const clients = (await res.json()) as MeClient[];

        let storedActiveClientId: string | null = null;
        if (typeof window !== 'undefined') {
          const stored = window.localStorage.getItem(ACTIVE_CLIENT_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as { id?: string };
              storedActiveClientId = parsed?.id ?? null;
            } catch {
              // ignore
            }
          }
        }

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
      } finally {
        if (!cancelled) setBootstrapResolved(true);
      }
    }

    void runBootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isLoading,
    user,
    authenticatedFetch,
    setActiveClient,
    router,
    pathname,
  ]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!bootstrapResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
