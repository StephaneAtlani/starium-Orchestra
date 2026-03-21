'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectDetailView } from '@/features/projects/components/project-detail-view';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <ProjectDetailView projectId={projectId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
