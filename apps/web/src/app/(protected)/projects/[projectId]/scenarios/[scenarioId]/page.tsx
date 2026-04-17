'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ScenarioWorkspacePage } from '@/features/projects/scenario-workspace/ScenarioWorkspacePage';

export default function ProjectScenarioWorkspaceRoutePage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const scenarioId = typeof params.scenarioId === 'string' ? params.scenarioId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <ScenarioWorkspacePage projectId={projectId} scenarioId={scenarioId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
