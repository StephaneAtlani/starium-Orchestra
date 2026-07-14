'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectReviewConductView } from '@/features/projects/components/project-review-conduct-view';

export default function ProjectReviewConductPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const reviewId = typeof params.reviewId === 'string' ? params.reviewId : '';

  return (
    <RequireActiveClient>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageContainer className="starium-conduct-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <ProjectReviewConductView projectId={projectId} reviewId={reviewId} />
        </PageContainer>
      </div>
    </RequireActiveClient>
  );
}
