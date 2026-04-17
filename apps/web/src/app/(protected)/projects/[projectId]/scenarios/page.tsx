'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectScenariosView } from '@/features/projects/components/project-scenarios-view';

export default function ProjectScenariosPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <ProjectScenariosView projectId={projectId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
