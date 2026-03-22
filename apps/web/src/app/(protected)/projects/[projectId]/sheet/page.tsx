'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectSheetView } from '@/features/projects/components/project-sheet-view';

export default function ProjectSheetPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <ProjectSheetView projectId={projectId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
