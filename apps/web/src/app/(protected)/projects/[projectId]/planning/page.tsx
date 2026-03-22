'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/feedback/loading-state';
import { ProjectPlanningView } from '@/features/projects/components/project-planning-view';

export default function ProjectPlanningPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <Suspense fallback={<LoadingState rows={6} />}>
          <ProjectPlanningView projectId={projectId} />
        </Suspense>
      </PageContainer>
    </RequireActiveClient>
  );
}
