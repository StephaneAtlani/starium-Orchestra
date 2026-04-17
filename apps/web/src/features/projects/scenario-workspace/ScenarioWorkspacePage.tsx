'use client';

import Link from 'next/link';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { projectScenarios } from '../constants/project-routes';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectScenarioQuery } from '../hooks/use-project-scenario-query';
import { useProjectScenariosMutations } from '../hooks/use-project-scenarios-mutations';
import { isProjectScenarioEditingAllowed } from '../lib/project-scenario-editing-allowed';
import { buildScenarioMetaLabel } from '../scenarios/ScenarioCard';
import type { ProjectScenarioApi } from '../types/project.types';
import { ProjectWorkspaceTabs } from '../components/project-workspace-tabs';
import { ScenarioWorkspaceTabs } from './ScenarioWorkspaceTabs';

const STATUS_LABEL: Record<ProjectScenarioApi['status'], string> = {
  DRAFT: 'DRAFT',
  SELECTED: 'SELECTED',
  ARCHIVED: 'ARCHIVED',
};

function statusClass(status: ProjectScenarioApi['status']): string {
  if (status === 'SELECTED') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300';
  }
  if (status === 'ARCHIVED') {
    return 'border-border/70 bg-muted text-muted-foreground';
  }
  return 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-300';
}

type ScenarioWorkspacePageProps = {
  projectId: string;
  scenarioId: string;
  /**
   * Fiche projet (modale) : pas de header page ni d’onglets navigation projet — contenu scénario seul.
   */
  embedded?: boolean;
  /** Modale : fermeture depuis les états erreur ou actions locales */
  onEmbeddedDismiss?: () => void;
};

export function ScenarioWorkspacePage({
  projectId,
  scenarioId,
  embedded = false,
  onEmbeddedDismiss,
}: ScenarioWorkspacePageProps) {
  const { data: project, isLoading: projectLoading, error: projectError } = useProjectDetailQuery(projectId);
  const scenarioQuery = useProjectScenarioQuery(projectId, scenarioId, Boolean(projectId && scenarioId));
  const { has } = usePermissions();
  const hasUpdate = has('projects.update');
  const projectAllowsScenarioEdits = project
    ? isProjectScenarioEditingAllowed(project)
    : false;
  const canMutate = Boolean(project) && hasUpdate && projectAllowsScenarioEdits;
  const readOnlyNotice =
    !project
      ? null
      : canMutate
        ? null
        : !hasUpdate
          ? 'Permission requise : projects.update pour modifier ce scénario.'
          : 'Le projet n’est pas en brouillon : les scénarios sont en lecture seule.';
  const { updateMutation } = useProjectScenariosMutations(projectId);

  if (!projectId || !scenarioId) {
    return <p className="text-sm text-destructive">Paramètres de route manquants.</p>;
  }

  if (projectLoading) {
    return <LoadingState rows={6} />;
  }

  if (projectError || !project) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle aria-hidden />
          <AlertTitle>Projet introuvable</AlertTitle>
          <AlertDescription>
            Vous n’avez pas accès à ce projet ou il n’existe plus.
          </AlertDescription>
        </Alert>
        {embedded && onEmbeddedDismiss ? (
          <Button type="button" variant="outline" size="sm" onClick={onEmbeddedDismiss}>
            Fermer
          </Button>
        ) : null}
      </div>
    );
  }

  if (scenarioQuery.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (scenarioQuery.isError || !scenarioQuery.data) {
    return (
      <div className="space-y-4">
        {!embedded ? (
          <Link
            href={projectScenarios(projectId)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Scénarios
          </Link>
        ) : null}
        <Alert variant="destructive" className="border-destructive/40">
          <AlertTitle>Scénario introuvable ou inaccessible</AlertTitle>
          <AlertDescription>
            Ce scénario n’existe pas, n’appartient pas à ce projet, ou vous n’y avez pas accès.
          </AlertDescription>
        </Alert>
        {embedded && onEmbeddedDismiss ? (
          <Button type="button" variant="outline" size="sm" onClick={onEmbeddedDismiss}>
            Fermer
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={projectScenarios(projectId)}>Retour à la liste des scénarios</Link>
          </Button>
        )}
      </div>
    );
  }

  const scenario = scenarioQuery.data;
  const isBaseline = scenario.status === 'SELECTED' || scenario.isBaseline;

  const workspaceTabs = (
    <ScenarioWorkspaceTabs
      projectId={projectId}
      scenario={scenario}
      canMutate={canMutate}
      readOnlyNotice={readOnlyNotice}
      isUpdatePending={updateMutation.isPending}
      presentation={embedded ? 'modalShell' : 'default'}
      onSaveOverview={(payload) => {
        updateMutation.mutate({ scenarioId, payload });
      }}
    />
  );

  if (embedded) {
    return (
      <div className="flex min-w-0 flex-col gap-0">
        <div
          className={cn(
            'rounded-2xl border border-border/50 bg-muted/30',
            'px-4 py-5 shadow-sm sm:px-6 sm:py-6',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Scénario
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {scenario.name}
              </h2>
              <p className="font-mono text-[0.8125rem] leading-relaxed text-muted-foreground">
                {buildScenarioMetaLabel(scenario)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge className={cn('shrink-0 shadow-sm', statusClass(scenario.status))}>
                {STATUS_LABEL[scenario.status]}
              </Badge>
              {isBaseline ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 border-emerald-500/35 bg-emerald-500/10 text-emerald-900 shadow-sm dark:text-emerald-300"
                >
                  BASELINE
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-5 min-w-0">{workspaceTabs}</div>
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="space-y-3">
          <Link
            href={projectScenarios(projectId)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Scénarios
          </Link>
          <PageHeader
            title={scenario.name}
            description={buildScenarioMetaLabel(scenario)}
            actions={
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Badge className={statusClass(scenario.status)}>{STATUS_LABEL[scenario.status]}</Badge>
                {isBaseline ? (
                  <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300">
                    BASELINE
                  </Badge>
                ) : null}
              </div>
            }
          />
        </div>
      </header>

      <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="space-y-0 border-b border-border/60 bg-muted/35 px-3 py-3.5 sm:px-5">
          <ProjectWorkspaceTabs projectId={projectId} projectStatus={project.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-4 sm:p-6">{workspaceTabs}</CardContent>
      </Card>
    </>
  );
}
