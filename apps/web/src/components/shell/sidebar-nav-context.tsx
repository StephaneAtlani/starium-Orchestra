'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type SidebarNavContextValue = {
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
};

const SidebarNavContext = createContext<SidebarNavContextValue | null>(null);

export function SidebarNavProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);

  const value = useMemo(
    () => ({ mobileOpen, openMobile, closeMobile, toggleMobile }),
    [mobileOpen, openMobile, closeMobile, toggleMobile],
  );

  return (
    <SidebarNavContext.Provider value={value}>{children}</SidebarNavContext.Provider>
  );
}

export function useSidebarNav(): SidebarNavContextValue {
  const ctx = useContext(SidebarNavContext);
  if (!ctx) {
    throw new Error('useSidebarNav must be used within SidebarNavProvider');
  }
  return ctx;
}
