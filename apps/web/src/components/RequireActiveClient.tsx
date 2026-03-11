'use client';

import React from 'react';
import { useAuth } from '../context/auth-context';
import { useActiveClient } from '../hooks/use-active-client';
import { ClientSwitcher } from './ClientSwitcher';

interface RequireActiveClientProps {
  children: React.ReactNode;
}

export function RequireActiveClient({ children }: RequireActiveClientProps) {
  const { accessToken } = useAuth();
  const { activeClient, initialized } = useActiveClient();

  if (!initialized) {
    return <div>Initialisation du contexte client…</div>;
  }

  if (!activeClient) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-muted-foreground">
          Veuillez sélectionner un client pour continuer.
        </p>
        {accessToken && <ClientSwitcher accessToken={accessToken} />}
      </div>
    );
  }

  return <>{children}</>;
}

