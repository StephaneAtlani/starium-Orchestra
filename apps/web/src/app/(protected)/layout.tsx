'use client';

import React from 'react';
import { QueryProvider } from '../../providers/query-provider';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="min-h-screen flex">
        {/* Sidebar placeholder (shell unique du cockpit) */}
        <aside className="w-60 border-r border-neutral-800 p-4">
          <nav className="space-y-2">
            <div className="text-xs font-semibold text-neutral-400 uppercase">
              Administration plateforme
            </div>
            <a href="/admin/clients" className="block text-sm text-neutral-100">
              Admin Studio
            </a>
          </nav>
        </aside>

        {/* Workspace area */}
        <div className="flex-1 flex flex-col">
          {/* Header workspace placeholder */}
          <header className="h-14 border-b border-neutral-800 px-6 flex items-center">
            <h1 className="text-sm font-medium text-neutral-200">
              Cockpit Starium Orchestra
            </h1>
          </header>

          <main className="flex-1 px-6 py-4">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}

