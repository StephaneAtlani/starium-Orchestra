'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { projectPlanning } from '../constants/project-routes';
import { ProjectWorkspaceShell } from './project-workspace-shell';
import { ProjectPlanningMacroTab } from './project-planning-macro-tab';
import { ProjectPlanningMilestonesTab } from './project-planning-milestones-tab';
import { ProjectGanttPanel } from './project-gantt-panel';

type PlanningSub = 'macro' | 'gantt' | 'milestones';

const SUB_TABS: { id: PlanningSub; label: string }[] = [
  { id: 'macro', label: 'Macro' },
  { id: 'gantt', label: 'Planning / Gantt' },
  { id: 'milestones', label: 'Jalons' },
];

function resolvePlanningSub(raw: string | null): PlanningSub {
  if (raw === 'gantt' || raw === 'milestones') return raw;
  return 'macro';
}

function PlanningSubTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: PlanningSub;
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
  const sub = resolvePlanningSub(searchParams.get('sub'));

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <PlanningSubTabs projectId={projectId} active={sub} />
      {sub === 'macro' && <ProjectPlanningMacroTab projectId={projectId} />}
      {sub === 'gantt' && <ProjectGanttPanel projectId={projectId} />}
      {sub === 'milestones' && <ProjectPlanningMilestonesTab projectId={projectId} />}
    </ProjectWorkspaceShell>
  );
}
