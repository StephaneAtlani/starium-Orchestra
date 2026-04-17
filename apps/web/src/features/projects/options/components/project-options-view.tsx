'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useProjectDetailQuery } from '@/features/projects/hooks/use-project-detail-query';
import { projectsList } from '@/features/projects/constants/project-routes';
import { ProjectWorkspaceTabs } from '@/features/projects/components/project-workspace-tabs';
import { ProjectOptionsTabs } from './project-options-tabs';

type Props = {
  projectId: string;
};

export function ProjectOptionsView({ projectId }: Props) {
  const { data: project, isLoading, error, refetch } = useProjectDetailQuery(projectId);

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (error || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle aria-hidden />
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Vous n’avez pas accès à ce projet ou il n’existe plus.</span>
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit shrink-0')}
            onClick={() => void refetch()}
          >
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

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
          <PageHeader
            title={project.name}
            description="Options du projet — planning, Microsoft 365 et synchronisation"
          />
        </div>
      </header>

      <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
          <ProjectWorkspaceTabs projectId={projectId} projectStatus={project.status} />
        </CardHeader>
        <CardContent className="flex min-h-0 w-full min-w-0 flex-col gap-4 p-4 sm:p-6">
          <ProjectOptionsTabs projectId={project.id} />
        </CardContent>
      </Card>
    </>
  );
}
