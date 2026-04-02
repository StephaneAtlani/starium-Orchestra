'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { StructureSubNav } from './structure-sub-nav';

export function StructureLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Organisation · Équipes
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Structure</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Équipes organisationnelles Starium — distinctes de Microsoft Teams.
            </p>
          </div>
          <StructureSubNav />
          {children}
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
