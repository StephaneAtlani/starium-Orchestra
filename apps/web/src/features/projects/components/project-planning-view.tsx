'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { projectsList, projectPlanning } from '../constants/project-routes';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import { ProjectPlanningTasksTab } from './project-planning-tasks-tab';
import { ProjectPlanningMilestonesTab } from './project-planning-milestones-tab';
import { ProjectPlanningKanbanTab } from './project-planning-kanban-tab';
import { ProjectGanttPanel } from './project-gantt-panel';

const SUB_TABS = [
  { id: 'tasks' as const, label: 'Tâches' },
  { id: 'milestones' as const, label: 'Jalons' },
  { id: 'gantt' as const, label: 'Planning / Gantt' },
  { id: 'kanban' as const, label: 'Kanban' },
];

function PlanningSubTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: 'tasks' | 'milestones' | 'gantt' | 'kanban';
}) {
  return (
    <div
      role="tablist"
      aria-label="Sous-navigation planning"
      className="flex min-w-0 flex-wrap gap-1 border-b border-border/60"
    >
      {SUB_TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <Link
            key={t.id}
            href={projectPlanning(projectId, t.id)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ProjectPlanningView({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const subRaw = searchParams.get('sub');
  const sub: 'tasks' | 'milestones' | 'gantt' | 'kanban' =
    subRaw === 'milestones' || subRaw === 'gantt' || subRaw === 'kanban'
      ? subRaw
      : 'tasks';

  const { data: project, isLoading, error } = useProjectDetailQuery(projectId);

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
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
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
            description="Planning — tâches, jalons et vue Gantt"
          />
        </div>
      </header>

      <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
          <ProjectWorkspaceTabs projectId={projectId} />
        </CardHeader>
        <CardContent className="flex min-h-0 w-full min-w-0 flex-col gap-4 p-4 sm:p-6">
          <PlanningSubTabs projectId={projectId} active={sub} />
          {sub === 'tasks' && <ProjectPlanningTasksTab projectId={projectId} />}
          {sub === 'milestones' && <ProjectPlanningMilestonesTab projectId={projectId} />}
          {sub === 'gantt' && <ProjectGanttPanel projectId={projectId} />}
          {sub === 'kanban' && <ProjectPlanningKanbanTab projectId={projectId} />}
        </CardContent>
      </Card>
    </>
  );
}
