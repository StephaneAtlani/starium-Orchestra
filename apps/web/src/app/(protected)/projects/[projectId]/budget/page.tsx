'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/feedback/loading-state';
import { ProjectBudgetView } from '@/features/projects/components/project-budget-view';

export default function ProjectBudgetPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <Suspense fallback={<LoadingState rows={6} />}>
          <ProjectBudgetView projectId={projectId} />
        </Suspense>
      </PageContainer>
    </RequireActiveClient>
  );
}
