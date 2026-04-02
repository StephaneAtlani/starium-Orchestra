'use client';

import { Suspense } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/feedback/loading-state';
import { TeamAssignmentsListView } from '@/features/teams/team-assignments/components/team-assignments-list-view';

export default function TeamAssignmentsPage() {
  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <Suspense fallback={<LoadingState rows={4} />}>
          <TeamAssignmentsListView />
        </Suspense>
      </PageContainer>
    </RequireActiveClient>
  );
}
