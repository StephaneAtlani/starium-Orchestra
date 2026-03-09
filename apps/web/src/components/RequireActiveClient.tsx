import React from 'react';
import { useActiveClient } from '../hooks/use-active-client';
import { ClientSwitcher } from './ClientSwitcher';

interface RequireActiveClientProps {
  accessToken: string;
  children: React.ReactNode;
}

export function RequireActiveClient({
  accessToken,
  children,
}: RequireActiveClientProps) {
  const { activeClient, initialized } = useActiveClient();

  if (!initialized) {
    return <div>Initialisation du contexte client…</div>;
  }

  if (!activeClient) {
    return (
      <div>
        <p>Veuillez sélectionner un client pour continuer.</p>
        <ClientSwitcher accessToken={accessToken} />
      </div>
    );
  }

  return <>{children}</>;
}

