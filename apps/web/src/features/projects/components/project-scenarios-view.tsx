'use client';

import Link from 'next/link';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { projectsList } from '../constants/project-routes';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectScenariosQuery } from '../hooks/use-project-scenarios-query';
import { ProjectScenariosTab } from '../scenarios/ProjectScenariosTab';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';

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

export function ProjectScenariosView({ projectId }: { projectId: string }) {
  const { data: project, isLoading: projectLoading, error: projectError } = useProjectDetailQuery(projectId);
  const scenariosQuery = useProjectScenariosQuery(projectId);
  const { has } = usePermissions();
  const canMutate = has('projects.update');

  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  if (projectLoading) {
    return <LoadingState rows={6} />;
  }

  if (projectError || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle aria-hidden />
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
        </AlertDescription>
      </Alert>
    );
  }

  const scenarios = scenariosQuery.data?.items ?? [];
  const screenState = deriveScenariosScreenState({
    isLoading: scenariosQuery.isLoading,
    isError: scenariosQuery.isError,
    totalItems: scenarios.length,
  });

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="space-y-3">
          <Link
            href={projectsList()}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Portefeuille projets
          </Link>
          <PageHeader title={project.name} description="Scénarios — variantes et baseline" />
        </div>
      </header>

      <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
          <ProjectWorkspaceTabs projectId={projectId} />
        </CardHeader>
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
          ) : (
            <ProjectScenariosTab
              projectId={projectId}
              scenarios={scenarios}
              isLoading={screenState === 'loading'}
              canMutate={canMutate}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
