'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { StariumAppEnv } from '@/lib/app-env';

const LoginAppEnvContext = createContext<StariumAppEnv>('production');

/** Fourni par `app/login/layout.tsx` (server) à partir de `NODE_ENV` runtime. */
export function LoginEnvProvider({
  appEnv,
  children,
}: {
  appEnv: StariumAppEnv;
  children: ReactNode;
}) {
  return (
    <LoginAppEnvContext.Provider value={appEnv}>
      {children}
    </LoginAppEnvContext.Provider>
  );
}

export function useLoginAppEnv(): StariumAppEnv {
  return useContext(LoginAppEnvContext);
}

export function useLoginIsPreproduction(): boolean {
  return useLoginAppEnv() === 'preproduction';
}

export function useLoginIsDevelopment(): boolean {
  return useLoginAppEnv() === 'development';
}
