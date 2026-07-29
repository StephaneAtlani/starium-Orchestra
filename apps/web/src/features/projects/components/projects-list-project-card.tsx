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
import {
  PortfolioEntityCard,
  PortfolioProgressBar,
  type StatusTone,
} from '@/components/portfolio';
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
      tone: 'danger' as StatusTone,
      badgeClass: 'border-0 bg-destructive/10 text-destructive',
      barTone: 'danger' as StatusTone,
      emphasisClass: 'text-destructive',
    };
  }

  if (project.status === 'COMPLETED') {
    return {
      label,
      tone: 'ok' as StatusTone,
      badgeClass:
        'border-0 bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
      barTone: 'ok' as StatusTone,
      emphasisClass: 'text-[color:var(--state-success)]',
    };
  }

  if (project.computedHealth === 'GREEN' && project.status === 'IN_PROGRESS') {
    return {
      label,
      tone: 'ok' as StatusTone,
      badgeClass:
        'border-0 bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
      barTone: 'ok' as StatusTone,
      emphasisClass: 'text-[color:var(--state-success)]',
    };
  }

  if (project.status === 'DRAFT' || project.status === 'PLANNED') {
    return {
      label,
      tone: 'info' as StatusTone,
      badgeClass: 'border-0 bg-sky-500/10 text-sky-700 dark:text-sky-300',
      barTone: 'muted' as StatusTone,
      emphasisClass: 'text-sky-700 dark:text-sky-300',
    };
  }

  if (project.status === 'ON_HOLD' || project.status === 'CANCELLED' || project.status === 'ARCHIVED') {
    return {
      label,
      tone: 'muted' as StatusTone,
      badgeClass: 'border-0 bg-muted text-muted-foreground',
      barTone: 'muted' as StatusTone,
      emphasisClass: 'text-muted-foreground',
    };
  }

  return {
    label,
    tone: 'warn' as StatusTone,
    badgeClass:
      'border-0 bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    barTone: 'warn' as StatusTone,
    emphasisClass: 'text-[color:var(--state-warning)]',
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

  return (
    <PortfolioEntityCard
      as="li"
      density="compact"
      tone={status.tone}
      icon={<CategoryIcon className="size-5" strokeWidth={1.75} />}
      title={
        <Link href={projectDetail(p.id)} className="line-clamp-2 hover:underline">
          {p.name}
        </Link>
      }
      actions={<ProjectsListRowActionsMenu project={p} />}
      badges={
        <>
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
        </>
      }
      subtitle={
        p.parentProject
          ? `Parent : ${p.parentProject.code} — ${p.parentProject.name}`
          : undefined
      }
      progress={
        <PortfolioProgressBar
          value={percent}
          tone={status.barTone}
          showPercent
          label={`Avancement ${p.name}`}
        />
      }
      footer={
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-x-2 gap-y-1 text-[10.5px] leading-snug text-muted-foreground">
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
        </div>
      }
    />
  );
}
