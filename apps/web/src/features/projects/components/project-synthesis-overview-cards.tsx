'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  Clock,
  Flag,
  History,
  TrendingUp,
  Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import { cn } from '@/lib/utils';
import { HealthBadge } from './project-badges';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import {
  formatProjectDateLong,
  formatProjectDateTimeFr,
  projectListProgressPercent,
  projectOwnerInitials,
} from '../lib/projects-list-display';
import { projectPlanning, projectSheet } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';

const AVATAR_COLORS = [
  'bg-rose-500/90 text-white',
  'bg-emerald-600/90 text-white',
  'bg-sky-600/90 text-white',
  'bg-violet-500/90 text-white',
  'bg-amber-600/90 text-white',
] as const;

function InsightCard({
  title,
  icon,
  children,
  footer,
  className,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn('flex h-full flex-col overflow-hidden shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 border-b border-border/50 pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-primary [&_svg]:size-4"
          aria-hidden
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center py-4">{children}</CardContent>
      {footer ? (
        <CardFooter className="border-t border-border/50 bg-card pt-0 pb-4">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

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
  badgeMerged,
}: {
  projectId: string;
  project: ProjectDetail;
  badgeMerged?: MergedUiBadges;
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

  const updateSummary = useMemo(
    () => `Dernière modification enregistrée. Avancement affiché : ${progressPct} %.`,
    [progressPct],
  );

  const insightCardFooterLinkClass = cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    'min-h-11 w-full rounded-full border-primary/35 bg-card font-semibold text-[color:var(--brand-gold-700)] hover:bg-primary/5 hover:text-[color:var(--brand-gold-700)]',
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <InsightCard
        title="Prochain jalon"
        icon={<Flag />}
        footer={
          <Link href={projectPlanning(projectId, 'milestones')} className={insightCardFooterLinkClass}>
            Voir le planning
          </Link>
        }
      >
        {milestonesQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : nextMilestone ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
              aria-hidden
            >
              <Flag className="size-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{nextMilestone.name}</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                {formatProjectDateLong(nextMilestone.targetDate)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucun jalon à venir. Ajoutez-en depuis le planning.
          </p>
        )}
      </InsightCard>

      <InsightCard
        title="Équipe projet"
        icon={<Users />}
        footer={
          <Link href={projectSheet(projectId)} className={cn(insightCardFooterLinkClass, 'gap-1.5')}>
            <Users className="size-4" aria-hidden />
            {teamMembers.length > 0
              ? `${teamMembers.length} membre${teamMembers.length > 1 ? 's' : ''}`
              : 'Gérer l’équipe'}
          </Link>
        }
      >
        {teamQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : visibleTeam.length > 0 ? (
          <div className="flex justify-center">
            <ul className="flex -space-x-2" aria-label={`${teamMembers.length} membres de l’équipe`}>
              {visibleTeam.map((member, index) => (
                <li key={member.id}>
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border-2 border-card text-xs font-semibold',
                      AVATAR_COLORS[index % AVATAR_COLORS.length],
                    )}
                    title={member.displayName}
                  >
                    {projectOwnerInitials(member.displayName)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucun membre renseigné sur la fiche projet.
          </p>
        )}
      </InsightCard>

      <InsightCard title="Indicateurs clés" icon={<TrendingUp />}>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Santé</span>
            <HealthBadge health={project.computedHealth} compact merged={badgeMerged} />
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="size-3.5" aria-hidden />
              </span>
              Avancement global
            </span>
            <span className="font-semibold tabular-nums">{progressPct}&nbsp;%</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-7 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400">
                <CheckSquare className="size-3.5" aria-hidden />
              </span>
              Tâches ouvertes
            </span>
            <span className="font-semibold tabular-nums">{project.openTasksCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-3.5" aria-hidden />
              </span>
              Risques ouverts
            </span>
            <span className="font-semibold tabular-nums">{project.openRisksCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-400">
                <Flag className="size-3.5" aria-hidden />
              </span>
              Jalons en retard
            </span>
            <span className="font-semibold tabular-nums">{project.delayedMilestonesCount}</span>
          </li>
        </ul>
      </InsightCard>

      <InsightCard
        title="Dernière mise à jour"
        icon={<Clock />}
        footer={
          <Link href={projectSheet(projectId)} className={insightCardFooterLinkClass}>
            <History className="mr-1.5 inline size-4" aria-hidden />
            Voir la fiche
          </Link>
        }
      >
        <div className="space-y-3 text-center">
          <div
            className="mx-auto flex size-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400"
            aria-hidden
          >
            <Clock className="size-5" />
          </div>
          <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
            {formatProjectDateTimeFr(project.updatedAt)}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{updateSummary}</p>
        </div>
      </InsightCard>
    </div>
  );
}
