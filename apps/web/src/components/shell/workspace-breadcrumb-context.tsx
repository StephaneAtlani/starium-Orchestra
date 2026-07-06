'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { WorkspaceBreadcrumbOverride } from '@/lib/navigation/build-workspace-breadcrumb';

type WorkspaceBreadcrumbContextValue = {
  override: WorkspaceBreadcrumbOverride | null;
  setOverride: (override: WorkspaceBreadcrumbOverride | null) => void;
};

const WorkspaceBreadcrumbContext = createContext<WorkspaceBreadcrumbContextValue | null>(null);

export function WorkspaceBreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<WorkspaceBreadcrumbOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);

  return (
    <WorkspaceBreadcrumbContext.Provider value={value}>
      {children}
    </WorkspaceBreadcrumbContext.Provider>
  );
}

export function useWorkspaceBreadcrumbContext(): WorkspaceBreadcrumbContextValue {
  const ctx = useContext(WorkspaceBreadcrumbContext);
  if (!ctx) {
    throw new Error('useWorkspaceBreadcrumbContext must be used within WorkspaceBreadcrumbProvider');
  }
  return ctx;
}

/**
 * Permet à une page de fournir le libellé métier du segment dynamique (projet, budget, etc.).
 * Nettoie l’override au démontage.
 */
export function useWorkspaceBreadcrumbOverride(override: WorkspaceBreadcrumbOverride | null) {
  const { setOverride } = useWorkspaceBreadcrumbContext();
  const entityLabel = override?.entityLabel;
  const entityHref = override?.entityHref;
  const items = override?.items;

  React.useEffect(() => {
    if (items?.length) {
      setOverride({ items });
      return () => setOverride(null);
    }
    if (entityLabel?.trim()) {
      setOverride({ entityLabel: entityLabel.trim(), entityHref });
      return () => setOverride(null);
    }
    setOverride(null);
    return () => setOverride(null);
  }, [setOverride, entityLabel, entityHref, items]);
}
