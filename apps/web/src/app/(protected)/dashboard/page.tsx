'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description="Vue d’ensemble du cockpit."
        />
        <p className="text-muted-foreground text-sm">
          Contenu du dashboard à venir.
        </p>
      </PageContainer>
    </RequireActiveClient>
  );
}
