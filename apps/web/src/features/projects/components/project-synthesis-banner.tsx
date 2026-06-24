'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Calendar,
  DollarSign,
  Flag,
  Pencil,
  Share2,
  UserRound,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectListProgressPercent,
  projectOwnerShortLabel,
  projectPortfolioCategoryIcon,
} from '../lib/projects-list-display';
import { projectSheet } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';
import { PROJECT_TYPE_LABEL } from '../constants/project-enum-labels';

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'ON_HOLD':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-300';
    case 'COMPLETED':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300';
    case 'CANCELLED':
    case 'ARCHIVED':
      return 'border-border bg-muted/50 text-muted-foreground';
    default:
      return 'border-primary/25 bg-primary/10 text-foreground';
  }
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-emerald-500';
    case 'ON_HOLD':
      return 'bg-amber-500';
    case 'COMPLETED':
      return 'bg-sky-500';
    default:
      return 'bg-primary';
  }
}

function priorityTextClass(priority: string): string {
  if (priority === 'HIGH' || priority === 'CRITICAL') return 'text-destructive';
  if (priority === 'MEDIUM') return 'text-amber-700 dark:text-amber-400';
  return 'text-foreground';
}

function BannerStat({
  icon,
  iconClassName,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4',
          iconClassName,
        )}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('truncate text-sm font-semibold tabular-nums', valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  );
}

export interface ProjectSynthesisBannerProps {
  project: ProjectDetail;
  /** Actions complémentaires (ACL, diagnostic accès, menu …). */
  moreActions?: ReactNode;
  shareAction?: ReactNode;
}

export function ProjectSynthesisBanner({
  project,
  moreActions,
  shareAction,
}: ProjectSynthesisBannerProps) {
  const CategoryIcon = projectPortfolioCategoryIcon(project);
  const subtitle =
    PROJECT_TYPE_LABEL[project.type as keyof typeof PROJECT_TYPE_LABEL] ?? project.type;
  const progress = projectListProgressPercent(project);
  const budgetLabel = formatProjectBudget(project.targetBudgetAmount) ?? '—';
  const statusLabel =
    PROJECT_STATUS_LABEL[project.status as keyof typeof PROJECT_STATUS_LABEL] ??
    project.status;
  const priorityLabel =
    PROJECT_PRIORITY_LABEL[project.priority as keyof typeof PROJECT_PRIORITY_LABEL] ??
    project.priority;
  const ownerLabel = project.ownerDisplayName
    ? projectOwnerShortLabel(project.ownerDisplayName)
    : '—';

  return (
    <section
      className="starium-panel relative z-10 overflow-visible rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="project-synthesis-banner-title"
    >
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div
              className="starium-synthesis-icon-well flex size-12 shrink-0 items-center justify-center rounded-xl border border-[color:var(--brand-gold-700)]/20 sm:size-14"
              aria-hidden
            >
              <CategoryIcon className="size-6 sm:size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="project-synthesis-banner-title"
                  className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                >
                  {project.name}
                </h1>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statusBadgeClass(project.status),
                  )}
                >
                  <span
                    className={cn('size-1.5 shrink-0 rounded-full', statusDotClass(project.status))}
                    aria-hidden
                  />
                  {statusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
            {shareAction ?? (
              <Button type="button" variant="outline" size="sm" className="min-h-10 gap-1.5" disabled>
                <Share2 className="size-4" aria-hidden />
                Partager
              </Button>
            )}
            <Link
              href={projectSheet(project.id)}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-10 gap-1.5 border-primary/40 bg-primary/5 font-medium text-[color:var(--brand-gold-700)] hover:bg-primary/10',
              )}
            >
              <Pencil className="size-4" aria-hidden />
              Modifier
            </Link>
            {moreActions ? (
              <div className="flex flex-wrap items-center gap-1">{moreActions}</div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">Avancement global</span>
            <span className="font-bold tabular-nums text-foreground">
              {Math.round(progress)}&nbsp;%
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avancement global du projet"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
            <BannerStat
              icon={<UserRound />}
              iconClassName="starium-synthesis-icon-well"
              label="Chef de projet"
              value={ownerLabel}
            />
            <BannerStat
              icon={<DollarSign />}
              iconClassName="bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
              label="Budget"
              value={budgetLabel}
            />
            <BannerStat
              icon={<Calendar />}
              iconClassName="bg-sky-500/15 text-sky-800 dark:text-sky-300"
              label="Échéance"
              value={formatProjectDateLong(project.targetEndDate)}
            />
            <BannerStat
              icon={<Flag />}
              iconClassName="bg-destructive/10 text-destructive"
              label="Priorité"
              value={priorityLabel}
              valueClassName={priorityTextClass(project.priority)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
