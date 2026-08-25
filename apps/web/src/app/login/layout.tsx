import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { LoginEnvProvider } from '@/features/auth/components/login-env-provider';
import {
  getAppEnv,
  isPreproductionEnv,
  isPreproductionHost,
  type StariumAppEnv,
} from '@/lib/app-env';

/** Relit NODE_ENV (fichier `.env` / process) à chaque requête. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function resolveLoginAppEnv(host: string): StariumAppEnv {
  const fromEnv = getAppEnv();
  if (fromEnv === 'development') {
    return 'development';
  }
  if (isPreproductionEnv() || isPreproductionHost(host)) {
    return 'preproduction';
  }
  return fromEnv;
}

export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headerList = await headers();
  const host =
    headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';

  return (
    <LoginEnvProvider appEnv={resolveLoginAppEnv(host)}>
      {children}
    </LoginEnvProvider>
  );
}
