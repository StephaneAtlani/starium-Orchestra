import React, { createContext, useCallback, useEffect, useState } from 'react';

export type ActiveClientStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';

export interface ActiveClient {
  id: string;
  name: string;
  slug: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status: ActiveClientStatus;
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

const STORAGE_KEY = 'starium.activeClient';

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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(client));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setInitialized(true);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveClient;
        setActiveClientState(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
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

