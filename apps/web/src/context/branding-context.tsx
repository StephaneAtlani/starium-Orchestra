'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useActiveClient } from '../hooks/use-active-client';
import type { ClientBranding } from '../types/client-branding';
import { DEFAULT_PLATFORM_BRANDING } from '../types/client-branding';

interface BrandingContextValue {
  branding: ClientBranding;
  /** Surcharge manuelle (ex. issue d'une API /admin/clients/:id/branding). */
  setBrandingOverride: (override: ClientBranding | null) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

/** Pour l'instant pas d'API branding ; on peut l'ajouter plus tard par clientId. */
function resolveBrandingForClient(
  _clientId: string | null,
  override: ClientBranding | null,
): ClientBranding {
  if (override) {
    return { ...DEFAULT_PLATFORM_BRANDING, ...override };
  }
  return DEFAULT_PLATFORM_BRANDING;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { activeClient } = useActiveClient();
  const [override, setBrandingOverride] = React.useState<ClientBranding | null>(null);

  const branding = useMemo(
    () => resolveBrandingForClient(activeClient?.id ?? null, override),
    [activeClient?.id, override],
  );

  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {};
    if (branding.primaryColor) vars['--color-primary'] = branding.primaryColor;
    if (branding.primarySoftColor) vars['--color-primary-soft'] = branding.primarySoftColor;
    return vars;
  }, [branding.primaryColor, branding.primarySoftColor]);

  const value = useMemo(
    () => ({
      branding,
      setBrandingOverride,
    }),
    [branding],
  );

  return (
    <BrandingContext.Provider value={value}>
      <div style={cssVars} className="h-full min-h-screen w-full">
        {children}
      </div>
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
