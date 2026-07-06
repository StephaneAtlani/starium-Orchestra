'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  type MergedUiBadges,
  type ProjectKindBadgeKey,
  type ProjectLifecycleStatusKey,
  projectKindBadgeClass,
} from '@/lib/ui/badge-registry';
import { projectDetail } from '../constants/project-routes';
import { PROJECT_STATUS_LABEL } from '../constants/project-enum-labels';
import {
  formatProjectDateLong,
  projectListProgressPercent,
  projectOwnerInitials,
  projectOwnerShortLabel,
  projectPortfolioCategoryIcon,
} from '../lib/projects-list-display';
import { ProjectsListRowActionsMenu } from './projects-list-row-actions-menu';
import { ProjectsListBudgetSummary } from './projects-list-budget-summary';
import type { ProjectListItem } from '../types/project.types';

function statusPresentation(project: ProjectListItem, badgeMerged: MergedUiBadges) {
  const lifecycle =
    badgeMerged.projectLifecycleStatus[project.status as ProjectLifecycleStatusKey];
  const label = lifecycle?.label ?? PROJECT_STATUS_LABEL[project.status] ?? project.status;

  if (project.signals.isLate) {
    return {
      label: 'En retard',
      tone: 'danger' as const,
      badgeClass: 'border-0 bg-destructive/10 text-destructive',
      accentTone: 'danger' as const,
      barTone: 'danger' as const,
      emphasisClass: 'text-destructive',
      iconClass: 'bg-destructive/10 text-destructive',
    };
  }

  if (project.status === 'COMPLETED') {
    return {
      label,
      tone: 'ok' as const,
      badgeClass:
        'border-0 bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
      accentTone: 'ok' as const,
      barTone: 'ok' as const,
      emphasisClass: 'text-[color:var(--state-success)]',
      iconClass: 'bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
    };
  }

  if (project.computedHealth === 'GREEN' && project.status === 'IN_PROGRESS') {
    return {
      label,
      tone: 'ok' as const,
      badgeClass:
        'border-0 bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
      accentTone: 'ok' as const,
      barTone: 'ok' as const,
      emphasisClass: 'text-[color:var(--state-success)]',
      iconClass: 'bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
    };
  }

  if (project.status === 'DRAFT' || project.status === 'PLANNED') {
    return {
      label,
      tone: 'info' as const,
      badgeClass: 'border-0 bg-sky-500/10 text-sky-700 dark:text-sky-300',
      accentTone: 'info' as const,
      barTone: 'muted' as const,
      emphasisClass: 'text-sky-700 dark:text-sky-300',
      iconClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    };
  }

  if (project.status === 'ON_HOLD' || project.status === 'CANCELLED' || project.status === 'ARCHIVED') {
    return {
      label,
      tone: 'muted' as const,
      badgeClass: 'border-0 bg-muted text-muted-foreground',
      accentTone: 'muted' as const,
      barTone: 'muted' as const,
      emphasisClass: 'text-muted-foreground',
      iconClass: 'bg-muted text-muted-foreground',
    };
  }

  return {
    label,
    tone: 'warn' as const,
    badgeClass:
      'border-0 bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    accentTone: 'warn' as const,
    barTone: 'warn' as const,
    emphasisClass: 'text-[color:var(--state-warning)]',
    iconClass: 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
  };
}

export function ProjectsListProjectCard({
  project: p,
  badgeMerged,
}: {
  project: ProjectListItem;
  badgeMerged: MergedUiBadges;
}) {
  const status = statusPresentation(p, badgeMerged);
  const CategoryIcon = projectPortfolioCategoryIcon(p);
  const percent = projectListProgressPercent(p);
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <li>
      <article className="starium-project-mobile-card relative overflow-hidden rounded-xl border border-border bg-card shadow-[var(--ds-card-shadow)]">
        <div
          className={cn(
            'starium-project-mobile-card__accent',
            `starium-project-mobile-card__accent--${status.accentTone}`,
          )}
          aria-hidden
        />

        <div className="p-3 pl-4">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                status.iconClass,
              )}
              aria-hidden
            >
              <CategoryIcon className="size-5" strokeWidth={1.75} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-0.5">
                <Link
                  href={projectDetail(p.id)}
                  className="starium-proj-name min-w-0 flex-1 text-base leading-tight"
                >
                  <span className="line-clamp-2">{p.name}</span>
                </Link>
                <ProjectsListRowActionsMenu project={p} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1">
                <RegistryBadge
                  className={cn(
                    'rounded-full px-2 py-px text-[11px] font-semibold',
                    projectKindBadgeClass(badgeMerged, p.kind),
                  )}
                >
                  {badgeMerged.projectKind[p.kind as ProjectKindBadgeKey].label}
                </RegistryBadge>
                <RegistryBadge
                  className={cn('rounded-full px-2 py-px text-[11px] font-semibold', status.badgeClass)}
                >
                  {status.label}
                </RegistryBadge>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <div className="starium-progress-track min-w-0 flex-1">
                  <div
                    className={cn('starium-progress-fill', `starium-progress-fill--${status.barTone}`)}
                    style={{ width: `${clamped}%` }}
                  />
                </div>
                <span className={cn('shrink-0 text-xs font-bold tabular-nums', status.emphasisClass)}>
                  {percent}%
                </span>
              </div>
            </div>
          </div>

          <footer className="mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-x-2 gap-y-1 text-[10.5px] leading-snug text-muted-foreground">
            <span className="inline-flex min-w-0 items-start gap-1 justify-self-start">
              <Calendar className="mt-0.5 size-3 shrink-0 opacity-60" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-wide">Fin</span>
                <span className={cn('mt-0.5 block font-medium tabular-nums', status.emphasisClass)}>
                  {formatProjectDateLong(p.targetEndDate)}
                </span>
              </span>
            </span>

            <ProjectsListBudgetSummary project={p} className="min-w-0 justify-self-center px-0.5" />

            {p.ownerDisplayName ? (
              <span className="inline-flex min-w-0 flex-col items-end justify-self-end text-right">
                <span className="text-[10px] font-medium uppercase tracking-wide">Responsable</span>
                <span className="mt-0.5 inline-flex min-w-0 items-center gap-1.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground"
                    aria-hidden
                  >
                    {projectOwnerInitials(p.ownerDisplayName)}
                  </span>
                  <span
                    className="truncate font-medium text-foreground"
                    title={p.ownerDisplayName}
                  >
                    {projectOwnerShortLabel(p.ownerDisplayName)}
                  </span>
                </span>
              </span>
            ) : (
              <span className="justify-self-end" aria-hidden />
            )}
          </footer>
        </div>
      </article>
    </li>
  );
}
