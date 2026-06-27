'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Diamond, GanttChart, Layers3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectPlanning } from '../constants/project-routes';
import { ProjectWorkspaceShell } from './project-workspace-shell';
import { ProjectPlanningMacroTab } from './project-planning-macro-tab';
import { ProjectPlanningMilestonesTab } from './project-planning-milestones-tab';
import { ProjectGanttPanel } from './project-gantt-panel';

type PlanningSub = 'macro' | 'gantt' | 'milestones';

const SUB_TABS: {
  id: PlanningSub;
  label: string;
  shortLabel: string;
  icon: typeof Layers3;
}[] = [
  { id: 'macro', label: 'Macro', shortLabel: 'Macro', icon: Layers3 },
  { id: 'gantt', label: 'Planning / Gantt', shortLabel: 'Gantt', icon: GanttChart },
  { id: 'milestones', label: 'Jalons', shortLabel: 'Jalons', icon: Diamond },
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
    <div className="starium-toolbar min-w-0">
      <div
        className="starium-seg-toggle min-h-11 max-w-full shrink-0 overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label="Sous-navigation planning"
      >
        {SUB_TABS.map((t) => {
          const isActive = active === t.id;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              href={projectPlanning(projectId, t.id)}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'starium-seg-btn min-h-9 min-w-[44px] px-3 sm:px-4',
                isActive && 'starium-seg-btn--active',
              )}
            >
              <Icon strokeWidth={1.75} width={14} height={14} aria-hidden />
              <span className="sm:hidden">{t.shortLabel}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </Link>
          );
        })}
      </div>
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
      <div className="flex min-w-0 flex-col gap-[18px] pt-4 md:pt-5">
        <PlanningSubTabs projectId={projectId} active={sub} />
        {sub === 'macro' && <ProjectPlanningMacroTab projectId={projectId} />}
        {sub === 'gantt' && <ProjectGanttPanel projectId={projectId} />}
        {sub === 'milestones' && <ProjectPlanningMilestonesTab projectId={projectId} />}
      </div>
    </ProjectWorkspaceShell>
  );
}
