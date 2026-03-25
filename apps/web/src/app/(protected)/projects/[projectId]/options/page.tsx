'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectOptionsView } from '@/features/projects/options/components/project-options-view';

export default function ProjectOptionsPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <ProjectOptionsView projectId={projectId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
