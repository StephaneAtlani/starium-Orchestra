'use client';

import React from 'react';
import { QueryProvider } from '../../providers/query-provider';
import { AppShell } from '../../components/shell/app-shell';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}

