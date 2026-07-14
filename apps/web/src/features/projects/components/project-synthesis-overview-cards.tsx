'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { UserInitialsAvatarStack } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import {
  formatProjectDateLong,
  formatProjectDateTimeFr,
  projectListProgressPercent,
} from '../lib/projects-list-display';
import { projectHistory, projectPlanning, projectSheet } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';
import { ProjectBudgetSynthesis } from './project-budget-synthesis';
import { ProjectCommitteeMoodOverviewCard } from './project-committee-mood-overview-card';
import { ProjectPilotageAttentionPanel } from './project-pilotage-attention-panel';
import { ProjectPostMortemOverviewBanner } from './project-post-mortem-overview-banner';
import { ProjectSynthesisRecentData } from './project-synthesis-recent-data';
import { ProjectChildrenSection } from './project-children-section';

function OvCard({
  title,
  icon,
  children,
  footer,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('starium-ov-card h-full', className)}>
      <div className="starium-ov-card__head">
        <h2 className="starium-ov-card__title">{title}</h2>
        <span className="starium-ov-card__head-ico" aria-hidden>
          {icon}
        </span>
      </div>
      {children}
      {footer}
    </article>
  );
}

function KpiRow({
  icon,
  iconClassName,
  value,
  valueClassName,
  label,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  value: React.ReactNode;
  valueClassName?: string;
  label: string;
}) {
  return (
    <div className="starium-ov-kpi-row">
      <div className={cn('starium-ov-kpi-row-ico', iconClassName)} aria-hidden>
        {icon}
      </div>
      <div className={cn('starium-ov-kpi-row-val', valueClassName)}>{value}</div>
      <div className="starium-ov-kpi-row-label">{label}</div>
    </div>
  );
}

/** Indices palette mockup (av-2, av-3, av-1, av-6 …). */
const TEAM_CARD_THEME_INDICES = [1, 2, 0, 5, 4, 3] as const;

function findNextMilestone(
  items: Array<{ name: string; targetDate: string; status: string }>,
) {
  const open = items.filter((m) => m.status !== 'ACHIEVED');
  if (open.length === 0) return null;
  const now = Date.now();
  const upcoming = [...open].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
  );
  const future = upcoming.find((m) => new Date(m.targetDate).getTime() >= now);
  return future ?? upcoming[0];
}

export function ProjectSynthesisOverviewCards({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectDetail;
  badgeMerged?: unknown;
}) {
  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const teamQuery = useProjectTeamQuery(projectId);

  const nextMilestone = useMemo(() => {
    const items = milestonesQuery.data?.items ?? [];
    return findNextMilestone(items);
  }, [milestonesQuery.data]);

  const teamMembers = teamQuery.data ?? [];
  const visibleTeam = teamMembers.slice(0, 4);
  const progressPct = Math.round(projectListProgressPercent(project));
  const openTasks = project.openTasksCount ?? 0;
  const totalTasksEstimate = openTasks + Math.max(0, Math.round(openTasks * 0.5));
  const completedTasks =
    totalTasksEstimate > 0
      ? Math.max(0, totalTasksEstimate - openTasks)
      : 0;
  const teamChargePct = Math.min(100, openTasks * 8);

  const lastModificationAt = project.lastModifiedAt ?? project.updatedAt;
  const lastModifiedBy = project.lastModifiedByDisplayName?.trim() || null;

  return (
    <div className="starium-proj-synthesis">
      <ProjectPostMortemOverviewBanner projectId={projectId} projectStatus={project.status} />

      <div className="mb-6">
        <ProjectChildrenSection project={project} />
      </div>

      <div className="starium-proj-overview-grid">
        <ProjectCommitteeMoodOverviewCard projectId={projectId} project={project} />

        <div className="starium-proj-overview-grid__core">
      <OvCard
        title="Prochain jalon"
        icon={<Flag strokeWidth={1.75} />}
        footer={
          <Link href={projectPlanning(projectId)} className="starium-ov-btn">
            <Calendar strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
            Voir le planning
          </Link>
        }
      >
        {milestonesQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : nextMilestone ? (
          <>
            <div className="starium-ov-card__jalon-ico" aria-hidden>
              <Flag strokeWidth={1.75} />
            </div>
            <p className="starium-ov-card__jalon-name">{nextMilestone.name}</p>
            <p className="starium-ov-card__jalon-date">
              <Calendar strokeWidth={1.75} aria-hidden />
              {formatProjectDateLong(nextMilestone.targetDate)}
            </p>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucun jalon à venir. Ajoutez-en depuis le planning.
          </p>
        )}
      </OvCard>

      <OvCard
        title="Équipe projet"
        icon={<Users strokeWidth={1.75} />}
        footer={
          <Link href={projectSheet(projectId)} className="starium-ov-btn">
            <Users strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
            {teamMembers.length > 0
              ? `${teamMembers.length} membre${teamMembers.length > 1 ? 's' : ''}`
              : 'Gérer l’équipe'}
          </Link>
        }
      >
        {teamQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : visibleTeam.length > 0 ? (
          <UserInitialsAvatarStack
            members={visibleTeam.map((member, index) => ({
              id: member.id,
              displayName: member.displayName,
              seed: member.userId ?? member.id,
              themeIndex: TEAM_CARD_THEME_INDICES[index] ?? index,
            }))}
            max={4}
            size="lg"
            className="starium-team-avatars"
            listLabel={`${teamMembers.length} membres de l’équipe`}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucun membre renseigné sur la fiche projet.
          </p>
        )}
      </OvCard>

      <OvCard title="Indicateurs clés" icon={<TrendingUp strokeWidth={1.75} />}>
        <div className="starium-ov-kpi-rows">
          <KpiRow
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              </svg>
            }
            iconClassName="text-[color:var(--state-success)]"
            value={`${progressPct}%`}
            valueClassName="text-[color:var(--state-success)]"
            label="Avancement global"
          />
          <KpiRow
            icon={<CheckCircle2 strokeWidth={2} />}
            iconClassName="text-[color:var(--state-info)]"
            value={
              totalTasksEstimate > 0
                ? `${completedTasks} / ${totalTasksEstimate}`
                : String(openTasks)
            }
            valueClassName="text-[color:var(--state-info)]"
            label="Tâches terminées"
          />
          <KpiRow
            icon={<AlertTriangle strokeWidth={2} />}
            iconClassName="text-[color:var(--state-danger)]"
            value={project.openRisksCount}
            valueClassName="text-[color:var(--state-danger)]"
            label="Risques ouverts"
          />
          <KpiRow
            icon={<Users strokeWidth={2} />}
            iconClassName="text-[color:var(--purple)]"
            value={`${teamChargePct}%`}
            valueClassName="text-[color:var(--purple)]"
            label="Charge équipe"
          />
        </div>
      </OvCard>

      <OvCard
        title="Dernière mise à jour"
        icon={<Clock strokeWidth={1.75} />}
        footer={
          <Link href={projectHistory(projectId)} className="starium-ov-btn">
            <Clock strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
            Voir l’historique
          </Link>
        }
      >
        <div className="starium-ov-update-ico" aria-hidden>
          <FileText strokeWidth={1.75} />
        </div>
        <time dateTime={lastModificationAt} className="starium-ov-update-time">
          {formatProjectDateTimeFr(lastModificationAt)}
        </time>
        <p className="starium-ov-update-text">
          {lastModifiedBy ? (
            <>
              <b>{lastModifiedBy}</b> a mis à jour l&apos;avancement global du projet à{' '}
              <b>{progressPct}%</b>.
            </>
          ) : (
            <>
              Fiche et champs de pilotage mis à jour — avancement <b>{progressPct}%</b>.
            </>
          )}
        </p>
      </OvCard>
        </div>
      </div>

      <ProjectPilotageAttentionPanel projectId={projectId} project={project} />

      <ProjectSynthesisRecentData projectId={projectId} project={project} />
      <ProjectBudgetSynthesis projectId={projectId} project={project} variant="overview" />
    </div>
  );
}
