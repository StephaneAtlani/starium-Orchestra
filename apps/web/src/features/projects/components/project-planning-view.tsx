'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { projectPlanning } from '../constants/project-routes';
import { ProjectWorkspaceShell } from './project-workspace-shell';
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

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <PlanningSubTabs projectId={projectId} active={sub} />
      {sub === 'tasks' && <ProjectPlanningTasksTab projectId={projectId} />}
      {sub === 'milestones' && <ProjectPlanningMilestonesTab projectId={projectId} />}
      {sub === 'gantt' && <ProjectGanttPanel projectId={projectId} />}
      {sub === 'kanban' && <ProjectPlanningKanbanTab projectId={projectId} />}
    </ProjectWorkspaceShell>
  );
}
