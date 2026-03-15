"use client";

import React from 'react';
import { Sidebar } from './sidebar';
import { WorkspaceHeader } from './workspace-header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="starium-main min-h-screen w-full">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="relative z-0 flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader />
          <main className="starium-main min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}

