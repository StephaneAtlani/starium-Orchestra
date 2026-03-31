import type { PortfolioGanttRow } from '../types/project.types';
import { cn } from '@/lib/utils';
import {
  PROJECT_CRITICALITY_LABEL,
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';

/** Remplissage % d’avancement = couleur de santé calculée. */
const healthFill: Record<PortfolioGanttRow['computedHealth'], string> = {
  GREEN: 'bg-emerald-600/60 dark:bg-emerald-400/45',
  ORANGE: 'bg-amber-600/55 dark:bg-amber-400/42',
  RED: 'bg-red-600/65 dark:bg-red-400/48',
};

/** Corps de barre = priorité (teinte dominante). */
const priorityBar: Record<string, string> = {
  LOW: 'border border-sky-600/42 bg-sky-500/[0.22] shadow-sm dark:border-sky-500/35 dark:bg-sky-500/14',
  MEDIUM:
    'border border-violet-600/48 bg-violet-500/[0.2] shadow-sm dark:border-violet-500/40 dark:bg-violet-500/13',
  HIGH: 'border border-orange-600/52 bg-orange-500/[0.24] shadow-sm dark:border-orange-500/45 dark:bg-orange-500/16',
};

const TERMINAL = new Set(['COMPLETED', 'CANCELLED', 'ARCHIVED']);

function barClassForPriority(priority: string): string {
  return priorityBar[priority] ?? priorityBar['MEDIUM'] ?? '';
}

/**
 * Barre Gantt portefeuille : couleur selon priorité + statut + criticité + nature ;
 * le segment d’avancement reste teinté par la santé calculée.
 */
export function portfolioGanttBarSegmentClasses(row: PortfolioGanttRow): {
  bar: string;
  fill: string;
  lateRing: string | undefined;
} {
  const terminal = TERMINAL.has(row.status);
  let bar: string;

  if (terminal) {
    bar =
      'border border-slate-500/45 bg-slate-500/[0.16] shadow-sm grayscale-[0.4] dark:border-slate-500/38 dark:bg-slate-500/12 dark:grayscale-[0.25]';
  } else if (row.status === 'ON_HOLD') {
    bar = cn(barClassForPriority(row.priority), 'border-dashed');
  } else if (row.status === 'DRAFT') {
    bar = cn(barClassForPriority(row.priority), 'opacity-[0.88]');
  } else {
    bar = barClassForPriority(row.priority);
  }

  if (row.criticality === 'HIGH' && !terminal) {
    bar = cn(bar, 'ring-2 ring-red-500/40 ring-offset-1 ring-offset-background dark:ring-red-400/35');
  } else if (row.criticality === 'MEDIUM' && !terminal) {
    bar = cn(bar, 'ring-1 ring-amber-500/45 dark:ring-amber-400/40');
  }

  if (row.kind === 'ACTIVITY') {
    bar = cn(bar, 'border-l-[3px] border-l-teal-500 dark:border-l-teal-400');
  }

  const fill = healthFill[row.computedHealth];

  const lateRing =
    row.isLate && !terminal
      ? 'ring-2 ring-amber-500/90 ring-offset-1 ring-offset-background dark:ring-amber-400/80'
      : undefined;

  return { bar, fill, lateRing };
}

const HEALTH_LABEL: Record<PortfolioGanttRow['computedHealth'], string> = {
  GREEN: 'Santé bon',
  ORANGE: 'Santé attention',
  RED: 'Santé critique',
};

export function portfolioGanttBarTooltipMeta(row: PortfolioGanttRow): string {
  const kind = PROJECT_KIND_LABEL[row.kind] ?? row.kind;
  const pri = PROJECT_PRIORITY_LABEL[row.priority] ?? row.priority;
  const st = PROJECT_STATUS_LABEL[row.status] ?? row.status;
  const crit = PROJECT_CRITICALITY_LABEL[row.criticality] ?? row.criticality;
  const health = HEALTH_LABEL[row.computedHealth] ?? row.computedHealth;
  const late = row.isLate ? ' · Retard' : '';
  return `${kind} · ${pri} · ${st} · ${crit} · ${health}${late}`;
}
