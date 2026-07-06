'use client';

import { cn } from '@/lib/utils';
import type { MergedUiBadges, ProjectLifecycleStatusKey } from '@/lib/ui/badge-registry';
import { PROJECT_STATUS_LABEL } from '../constants/project-enum-labels';
import type { ProjectListItem } from '../types/project.types';

type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const TONE_CLASS: Record<
  PillTone,
  { wrap: string; dot: string; text: string }
> = {
  success: {
    wrap: 'bg-emerald-500/12',
    dot: 'bg-emerald-600',
    text: 'text-emerald-800 dark:text-emerald-400',
  },
  warning: {
    wrap: 'bg-amber-500/12',
    dot: 'bg-amber-600',
    text: 'text-amber-800 dark:text-amber-400',
  },
  danger: {
    wrap: 'bg-red-500/10',
    dot: 'bg-red-700',
    text: 'text-red-800 dark:text-red-400',
  },
  info: {
    wrap: 'bg-sky-500/12',
    dot: 'bg-sky-500',
    text: 'text-sky-800 dark:text-sky-400',
  },
  muted: {
    wrap: 'bg-muted/50',
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
  },
};

function TableStatusPill({ label, tone }: { label: string; tone: PillTone }) {
  const c = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        c.wrap,
        c.text,
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', c.dot)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

function TableHealthDot({ label, tone }: { label: string; tone: PillTone }) {
  const c = TONE_CLASS[tone];
  return (
    <span className={cn('inline-flex max-w-full items-center gap-2 text-xs font-medium', c.text)}>
      <span className={cn('size-2 shrink-0 rounded-full', c.dot)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

function statusTone(status: string, isLate: boolean): PillTone {
  if (isLate) return 'danger';
  switch (status) {
    case 'IN_PROGRESS':
      return 'success';
    case 'PLANNED':
    case 'DRAFT':
      return 'info';
    case 'ON_HOLD':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
    case 'ARCHIVED':
      return 'muted';
    default:
      return 'muted';
  }
}

function healthTone(health: ProjectListItem['computedHealth']): PillTone {
  if (health === 'RED') return 'danger';
  if (health === 'ORANGE') return 'warning';
  return 'success';
}

export function ProjectTableStatusPill({
  project,
  badgeMerged,
}: {
  project: ProjectListItem;
  badgeMerged?: MergedUiBadges | null;
}) {
  const isLate = project.signals.isLate;
  const lifecycle = badgeMerged?.projectLifecycleStatus[
    project.status as ProjectLifecycleStatusKey
  ];
  const label = isLate
    ? 'En retard'
    : lifecycle?.label ?? PROJECT_STATUS_LABEL[project.status] ?? project.status;

  return <TableStatusPill label={label} tone={statusTone(project.status, isLate)} />;
}

export function formatTableDisplayLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('fr-FR') + trimmed.slice(1);
}

function healthTableLabel(
  health: ProjectListItem['computedHealth'],
  badgeMerged?: MergedUiBadges | null,
): string {
  if (badgeMerged) {
    const raw = badgeMerged.projectComputedHealth[health as 'GREEN' | 'ORANGE' | 'RED'].label;
    const stripped = raw.replace(/^Santé\s*:\s*/i, '').trim();
    if (stripped) return formatTableDisplayLabel(stripped);
  }
  const defaults: Record<ProjectListItem['computedHealth'], string> = {
    GREEN: 'Bonne',
    ORANGE: 'Moyenne',
    RED: 'Critique',
  };
  return defaults[health];
}

export function getProjectHealthTableLabel(
  health: ProjectListItem['computedHealth'],
  badgeMerged?: MergedUiBadges | null,
): string {
  return healthTableLabel(health, badgeMerged);
}

export function getProjectStatusTableLabel(
  project: ProjectListItem,
  badgeMerged?: MergedUiBadges | null,
): string {
  const isLate = project.signals.isLate;
  const lifecycle = badgeMerged?.projectLifecycleStatus[
    project.status as ProjectLifecycleStatusKey
  ];
  return isLate
    ? 'En retard'
    : lifecycle?.label ?? PROJECT_STATUS_LABEL[project.status] ?? project.status;
}

export function ProjectTableHealthPill({
  health,
  badgeMerged,
}: {
  health: ProjectListItem['computedHealth'];
  badgeMerged?: MergedUiBadges | null;
}) {
  return (
    <TableHealthDot label={healthTableLabel(health, badgeMerged)} tone={healthTone(health)} />
  );
}
