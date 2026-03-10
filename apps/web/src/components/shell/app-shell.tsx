"use client";

import React from 'react';
import { Sidebar } from './sidebar';
import { WorkspaceHeader } from './workspace-header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="min-h-screen flex w-full"
      style={{
        background: 'var(--color-bg-app)',
      }}
    >
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{
          borderLeft: '1px solid var(--color-border-default)',
          background: 'var(--color-bg-app)',
        }}
      >
        <WorkspaceHeader />
        <main className="flex-1 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}

