'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';

export function WorkspaceHeader() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient } = useActiveClient();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header
      className="h-14 sticky top-0 z-10 flex items-center justify-between shrink-0 px-6 shadow-sm"
      style={{
        background: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          Cockpit Starium Orchestra
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Pilotage multi-clients
        </span>
      </div>
      <div className="flex items-center gap-4">
        {activeClient && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {activeClient.name}
          </span>
        )}
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

