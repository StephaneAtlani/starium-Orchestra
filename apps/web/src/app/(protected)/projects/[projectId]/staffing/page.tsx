'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectStaffingView } from '@/features/projects/components/project-staffing-view';

export default function ProjectStaffingPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <ProjectStaffingView projectId={projectId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
