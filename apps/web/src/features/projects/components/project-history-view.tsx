'use client';

import { ProjectAuditHistorySection } from './project-audit-history-section';
import { ProjectWorkspaceShell } from './project-workspace-shell';

export function ProjectHistoryView({ projectId }: { projectId: string }) {
  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <ProjectAuditHistorySection projectId={projectId} />
    </ProjectWorkspaceShell>
  );
}
