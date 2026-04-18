"use client";

import React, { createContext, useCallback, useEffect, useState } from 'react';
import {
  ACTIVE_CLIENT_STORAGE_KEY,
  LAST_SELECTED_CLIENT_ID_KEY,
} from '../lib/auth/remembered-client-id';

export type ActiveClientStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';

export interface ActiveClient {
  id: string;
  name: string;
  slug: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status: ActiveClientStatus;
  /** Présent quand le client vient de /api/me/clients (bootstrap). */
  budgetAccountingEnabled?: boolean;
}

interface ActiveClientContextValue {
  activeClient: ActiveClient | null;
  setActiveClient: (client: ActiveClient | null) => void;
  initialized: boolean;
}

export const ActiveClientContext = createContext<ActiveClientContextValue>({
  activeClient: null,
  setActiveClient: () => undefined,
  initialized: false,
});

export function ActiveClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeClient, setActiveClientState] = useState<ActiveClient | null>(
    null,
  );
  const [initialized, setInitialized] = useState(false);

  const setActiveClient = useCallback((client: ActiveClient | null) => {
    setActiveClientState(client);
    if (typeof window === 'undefined') return;
    if (client) {
      window.localStorage.setItem(
        ACTIVE_CLIENT_STORAGE_KEY,
        JSON.stringify(client),
      );
      window.localStorage.setItem(LAST_SELECTED_CLIENT_ID_KEY, client.id);
    } else {
      window.localStorage.removeItem(ACTIVE_CLIENT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setInitialized(true);
      return;
    }
    const stored = window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveClient;
        setActiveClientState(parsed);
      } catch {
        window.localStorage.removeItem(ACTIVE_CLIENT_STORAGE_KEY);
      }
    }
    setInitialized(true);
  }, []);

  return (
    <ActiveClientContext.Provider
      value={{ activeClient, setActiveClient, initialized }}
    >
      {children}
    </ActiveClientContext.Provider>
  );
}

