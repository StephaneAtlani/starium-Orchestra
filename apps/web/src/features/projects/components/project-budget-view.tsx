'use client';

import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { ProjectBudgetPageContent } from './project-budget-page-content';
import { ProjectWorkspaceShell } from './project-workspace-shell';

export function ProjectBudgetView({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProjectDetailQuery(projectId);

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      {isLoading || !project ? (
        <LoadingState rows={6} />
      ) : (
        <ProjectBudgetPageContent projectId={projectId} project={project} />
      )}
    </ProjectWorkspaceShell>
  );
}
