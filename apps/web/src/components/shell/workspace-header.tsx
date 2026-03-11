'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

export function WorkspaceHeader() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient } = useActiveClient();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Dashboard</div>
          <div className="truncate text-xs text-muted-foreground">
            {activeClient ? (
              <span className="inline-flex items-center gap-2">
                <Badge variant="secondary">Client</Badge>
                <span className="truncate">{activeClient.name}</span>
              </span>
            ) : (
              <span>Contexte plateforme / multi-clients</span>
            )}
          </div>
        </div>
        <div className="hidden max-w-md flex-1 md:block">
          <Input placeholder="Search" aria-label="Search" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {accessToken && <ClientSwitcher accessToken={accessToken} />}
        {user && (
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Déconnexion
          </Button>
        )}
      </div>
    </header>
  );
}

