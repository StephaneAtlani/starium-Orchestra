'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ScenarioCockpitPage } from '@/features/projects/scenario-cockpit/ScenarioCockpitPage';

export default function ProjectScenarioCockpitRoutePage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <ScenarioCockpitPage projectId={projectId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
