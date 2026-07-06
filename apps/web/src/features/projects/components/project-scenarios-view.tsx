'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectScenariosQuery } from '../hooks/use-project-scenarios-query';
import { isProjectScenarioEditingAllowed } from '../lib/project-scenario-editing-allowed';
import { ProjectScenariosTab } from '../scenarios/ProjectScenariosTab';
import { ProjectWorkspaceShell } from './project-workspace-shell';

export type ScenariosScreenState = 'loading' | 'error' | 'empty' | 'success';

export function deriveScenariosScreenState(args: {
  isLoading: boolean;
  isError: boolean;
  totalItems: number;
}): ScenariosScreenState {
  if (args.isLoading) return 'loading';
  if (args.isError) return 'error';
  return args.totalItems === 0 ? 'empty' : 'success';
}

function ProjectScenariosContent({ projectId }: { projectId: string }) {
  const { data: project } = useProjectDetailQuery(projectId);
  const scenariosQuery = useProjectScenariosQuery(projectId);
  const { has } = usePermissions();
  const hasUpdate = has('projects.update');
  const projectAllowsScenarioEdits = project
    ? isProjectScenarioEditingAllowed(project)
    : false;
  const canMutate = Boolean(project) && hasUpdate && projectAllowsScenarioEdits;
  const mutationDisabledReason = !project
    ? null
    : !hasUpdate
      ? 'Permission requise : projects.update.'
      : !projectAllowsScenarioEdits
        ? 'Projet hors brouillon : scénarios en lecture seule.'
        : null;

  if (!project) return null;

  const scenarios = scenariosQuery.data?.items ?? [];
  const screenState = deriveScenariosScreenState({
    isLoading: scenariosQuery.isLoading,
    isError: scenariosQuery.isError,
    totalItems: scenarios.length,
  });

  return (
    <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
      <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
        {screenState === 'error' ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Impossible de charger les scénarios</AlertTitle>
            <AlertDescription>
              {scenariosQuery.error instanceof Error
                ? scenariosQuery.error.message
                : 'Erreur réseau ou accès refusé.'}
            </AlertDescription>
          </Alert>
        ) : screenState === 'loading' ? (
          <LoadingState rows={4} />
        ) : (
          <ProjectScenariosTab
            projectId={projectId}
            scenarios={scenarios}
            isLoading={false}
            canMutate={canMutate}
            mutationDisabledReason={mutationDisabledReason}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectScenariosView({ projectId }: { projectId: string }) {
  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <ProjectScenariosContent projectId={projectId} />
    </ProjectWorkspaceShell>
  );
}
