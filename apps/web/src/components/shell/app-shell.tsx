"use client";

import React from 'react';
import { Sidebar } from './sidebar';
import { WorkspaceHeader } from './workspace-header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
      </div>
    </div>
  );
}

