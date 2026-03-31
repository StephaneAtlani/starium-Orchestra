"use client";

import React from 'react';
import { Sidebar } from './sidebar';
import { SidebarNavProvider } from './sidebar-nav-context';
import { WorkspaceHeader } from './workspace-header';

/** Contenu centré, même largeur pour header et main (alignement vertical). */
const CONTENT_WRAPPER = 'mx-auto w-full max-w-7xl px-6 sm:px-8';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarNavProvider>
      <div className="starium-main flex h-[100dvh] min-h-0 w-full flex-row overflow-hidden">
        <Sidebar />
        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <WorkspaceHeader contentClassName={CONTENT_WRAPPER} />
          <main className="starium-main min-h-0 flex-1 overflow-auto">
            <div className={`${CONTENT_WRAPPER} py-6 sm:py-8`}>{children}</div>
          </main>
        </div>
      </div>
    </SidebarNavProvider>
  );
}

