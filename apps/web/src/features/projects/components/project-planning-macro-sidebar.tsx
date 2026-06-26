'use client';

import Link from 'next/link';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Flag,
  Users,
} from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import { projectPlanning } from '../constants/project-routes';
import {
  formatProjectDateLong,
  projectListProgressPercent,
} from '../lib/projects-list-display';
import { formatDaysUntilFr } from '../lib/build-macro-planning-gantt';
import type { ProjectDetail } from '../types/project.types';

const MACRO_SIDEBAR_CARD =
  'starium-panel starium-side-panel overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card';

type MilestoneSidebarItem = {
  name: string;
  targetDate: string;
  status: string;
  description?: string | null;
};

function resolveMilestoneSidebar(
  items: MilestoneSidebarItem[],
): {
  title: string;
  milestone: MilestoneSidebarItem | null;
  emptyText: string | null;
} {
  const open = items.filter((m) => m.status !== 'ACHIEVED' && m.status !== 'CANCELLED');
  if (open.length === 0) {
    return {
      title: 'Jalons',
      milestone: null,
      emptyText: 'Aucun jalon à venir.',
    };
  }

  const now = Date.now();
  const sorted = [...open].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
  );
  const upcoming = sorted.find((m) => new Date(m.targetDate).getTime() >= now);
  if (upcoming) {
    return { title: 'Prochain jalon', milestone: upcoming, emptyText: null };
  }

  const past = sorted.filter((m) => new Date(m.targetDate).getTime() < now);
  const mostRecentOverdue = past[past.length - 1] ?? null;
  return {
    title: 'Jalon en retard',
    milestone: mostRecentOverdue,
    emptyText: null,
  };
}

function healthLabel(health: string): string {
  if (health === 'GREEN') return 'Sain';
  if (health === 'ORANGE') return 'Attention';
  if (health === 'RED') return 'Critique';
  return 'À suivre';
}

function healthBadgeClass(health: string): string {
  if (health === 'GREEN') return 'starium-mpg-health--ok';
  if (health === 'ORANGE') return 'starium-mpg-health--warn';
  if (health === 'RED') return 'starium-mpg-health--danger';
  return 'starium-mpg-health--neutral';
}

export function ProjectPlanningMacroSidebar({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectDetail;
}) {
  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const tasksQuery = useProjectTasksQuery(projectId);
  const teamQuery = useProjectTeamQuery(projectId);

  const milestoneSidebar = resolveMilestoneSidebar(milestonesQuery.data?.items ?? []);
  const tasks = tasksQuery.data?.items ?? [];
  const lateTasks = tasks.filter(
    (t) =>
      t.isLate ||
      (t.status !== 'DONE' &&
        t.status !== 'CANCELLED' &&
        t.plannedEndDate &&
        new Date(t.plannedEndDate).getTime() < Date.now()),
  ).length;
  const progressPct = Math.round(projectListProgressPercent(project));
  const openTasks = project.openTasksCount ?? 0;
  const teamChargePct = Math.min(100, openTasks * 8 + (teamQuery.data?.length ?? 0) * 4);

  const health = project.computedHealth ?? 'GREEN';
  const healthText =
    health === 'GREEN'
      ? 'Aucun retard critique détecté. Le projet est aligné avec l’échéance.'
      : health === 'ORANGE'
        ? 'Points de vigilance sur le planning — à surveiller.'
        : 'Retards ou dérives détectés sur le planning.';

  return (
    <div className="starium-macro-sidebar" aria-label="Synthèse planning">
      <article className={MACRO_SIDEBAR_CARD}>
        <div className="starium-sp-head">
          <span className="starium-sp-title">
            {milestonesQuery.isLoading ? 'Jalons' : milestoneSidebar.title}
          </span>
        </div>
        {milestonesQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : milestoneSidebar.milestone ? (
          <>
            <div className="starium-sp-jalon">
              <div className="starium-sp-jalon-ico" aria-hidden>
                <Flag strokeWidth={1.75} />
              </div>
              <div>
                <div className="starium-sp-jalon-name">{milestoneSidebar.milestone.name}</div>
                <div className="starium-sp-jalon-date">
                  {formatProjectDateLong(milestoneSidebar.milestone.targetDate)}
                  {formatDaysUntilFr(milestoneSidebar.milestone.targetDate)
                    ? ` (${formatDaysUntilFr(milestoneSidebar.milestone.targetDate)})`
                    : null}
                </div>
              </div>
            </div>
            {milestoneSidebar.milestone.description ? (
              <p className="starium-sp-text">{milestoneSidebar.milestone.description}</p>
            ) : null}
          </>
        ) : (
          <p className="starium-sp-text">{milestoneSidebar.emptyText}</p>
        )}
        <Link href={projectPlanning(projectId, 'milestones')} className="starium-sp-btn">
          Voir les jalons
        </Link>
      </article>

      <article className={MACRO_SIDEBAR_CARD}>
        <div className="starium-sp-head">
          <span className="starium-sp-title">Santé du planning</span>
          <span className="starium-sp-head-ico" aria-hidden>
            <Activity strokeWidth={2} className="text-[color:var(--state-success)]" />
          </span>
        </div>
        <div className="mb-3">
          <span className={cn('starium-mpg-health', healthBadgeClass(health))}>
            <Activity strokeWidth={2} aria-hidden />
            {healthLabel(health)}
          </span>
        </div>
        <p className="starium-sp-text">{healthText}</p>

        <div className="starium-sp-metric">
          <div className="starium-sp-metric-ico text-[color:var(--state-success)]" aria-hidden>
            <CheckCircle2 strokeWidth={2} />
          </div>
          <span className="starium-sp-metric-label">Avancement planning</span>
          <span className="starium-sp-metric-val text-[color:var(--state-success)]">
            {progressPct}%
          </span>
        </div>
        <div className="starium-sp-metric">
          <div className="starium-sp-metric-ico text-[color:var(--state-danger)]" aria-hidden>
            <CalendarClock strokeWidth={2} />
          </div>
          <span className="starium-sp-metric-label">Tâches en retard</span>
          <span className="starium-sp-metric-val text-[color:var(--state-danger)]">
            {lateTasks}
          </span>
        </div>
        <div className="starium-sp-metric">
          <div className="starium-sp-metric-ico text-[color:var(--purple)]" aria-hidden>
            <Users strokeWidth={2} />
          </div>
          <span className="starium-sp-metric-label">Charge équipe</span>
          <span className="starium-sp-metric-val text-[color:var(--purple)]">
            {teamChargePct}%
          </span>
        </div>

        <Link href={projectPlanning(projectId, 'gantt')} className="starium-sp-btn starium-sp-btn--spaced">
          Voir l&apos;analyse détaillée
        </Link>
      </article>
    </div>
  );
}
