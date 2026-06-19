'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useProjectDetailQuery } from '@/features/projects/hooks/use-project-detail-query';
import { ProjectWorkspaceShell } from '@/features/projects/components/project-workspace-shell';
import { ProjectOptionsTabs } from './project-options-tabs';

type Props = {
  projectId: string;
};

function ProjectOptionsContent({ projectId }: Props) {
  const { data: project } = useProjectDetailQuery(projectId);
  if (!project) return null;

  return (
    <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
      <CardContent className="flex min-h-0 w-full min-w-0 flex-col gap-4 p-4 sm:p-6">
        <ProjectOptionsTabs
          projectId={project.id}
          projectName={project.name}
          projectCode={project.code ?? null}
        />
      </CardContent>
    </Card>
  );
}

export function ProjectOptionsView({ projectId }: Props) {
  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <ProjectOptionsContent projectId={projectId} />
    </ProjectWorkspaceShell>
  );
}
