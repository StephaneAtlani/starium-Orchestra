'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { ProjectReviewsTab } from './project-reviews-tab';
import { ProjectSynthesisOverviewCards } from './project-synthesis-overview-cards';
import { ProjectWorkspaceShell } from './project-workspace-shell';

function ProjectDetailTabbedContent({ projectId }: { projectId: string }) {
  const { data: project } = useProjectDetailQuery(projectId);
  const searchParams = useSearchParams();
  const showPoints = searchParams.get('tab') === 'points';

  if (!project) {
    return <LoadingState rows={6} />;
  }

  if (showPoints) {
    return (
      <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Suspense fallback={<LoadingState rows={4} />}>
            <ProjectReviewsTab projectId={projectId} projectStatus={project.status} />
          </Suspense>
        </CardContent>
      </Card>
    );
  }

  return <ProjectSynthesisOverviewCards projectId={projectId} project={project} />;
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <Suspense fallback={<LoadingState rows={4} />}>
        <ProjectDetailTabbedContent projectId={projectId} />
      </Suspense>
    </ProjectWorkspaceShell>
  );
}
