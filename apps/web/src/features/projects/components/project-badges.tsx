'use client';

import { cn } from '@/lib/utils';
import type { ProjectListItem, ProjectSignals } from '../types/project.types';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import {
  projectComputedHealthBadgeClass,
  projectComputedHealthShortLabel,
  projectPortfolioSignalBadgeClass,
  type ProjectComputedHealthKey,
  type ProjectPortfolioSignalKey,
} from '@/lib/ui/badge-registry';

const chip =
  'inline-flex min-h-[1.375rem] items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none';

const legacyHealthStyles: Record<ProjectListItem['computedHealth'], string> = {
  RED: 'border-destructive/35 bg-destructive/[0.08] text-destructive',
  ORANGE:
    'border-amber-300/80 bg-amber-50 text-[#1c1917] dark:border-amber-400/40 dark:bg-amber-100/90',
  GREEN: '!border-emerald-700 !bg-emerald-600 !text-white',
};

const legacyHealthLabels: Record<ProjectListItem['computedHealth'], string> = {
  RED: 'Santé : critique',
  ORANGE: 'Santé : attention',
  GREEN: 'Santé : bon',
};

const legacyHealthLabelsCompact: Record<ProjectListItem['computedHealth'], string> = {
  RED: 'Critique',
  ORANGE: 'Attention',
  GREEN: 'Bon',
};

export function HealthBadge({
  health,
  compact = false,
  merged,
}: {
  health: ProjectListItem['computedHealth'];
  /** Libellés courts pour tableaux denses. */
  compact?: boolean;
  /** Config badges client/plateforme — si fourni, styles issus de l’administration badges. */
  merged?: MergedUiBadges | null;
}) {
  if (merged) {
    const hk = health as ProjectComputedHealthKey;
    const label = compact
      ? projectComputedHealthShortLabel(hk)
      : merged.projectComputedHealth[hk].label;
    return (
      <span
        className={cn(
          chip,
          compact && '!min-h-0 px-1.5 py-0.5 text-[0.65rem]',
          'font-normal',
          projectComputedHealthBadgeClass(merged, health),
        )}
        data-health={health.toLowerCase()}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        chip,
        compact && '!min-h-0 px-1.5 py-0.5 text-[0.65rem]',
        legacyHealthStyles[health],
      )}
      data-health={health.toLowerCase()}
    >
      {compact ? legacyHealthLabelsCompact[health] : legacyHealthLabels[health]}
    </span>
  );
}

const portfolioItems: {
  key: ProjectPortfolioSignalKey;
  label: string;
  show: (s: ProjectSignals) => boolean;
}[] = [
  { key: 'late', label: 'En retard', show: (s) => s.isLate },
  { key: 'blocked', label: 'Bloqué', show: (s) => s.isBlocked },
  { key: 'critical', label: 'Critique', show: (s) => s.isCritical },
  {
    key: 'norisk',
    label: 'Sans étude de risque',
    show: (s) => s.hasNoRisks,
  },
  { key: 'noowner', label: 'Sans responsable', show: (s) => s.hasNoOwner },
];

const legacyVariantClass = {
  danger:
    'border-destructive/35 bg-destructive/[0.08] text-destructive dark:border-destructive/50 dark:bg-destructive/15',
  warn: 'border-amber-300/80 bg-amber-50 text-[#1c1917] dark:border-amber-400/40 dark:bg-amber-100/90',
  muted: 'border-border bg-muted/70 text-muted-foreground',
} as const;

function legacyVariantForKey(key: ProjectPortfolioSignalKey): keyof typeof legacyVariantClass {
  if (key === 'late' || key === 'blocked' || key === 'critical') return 'danger';
  if (key === 'norisk' || key === 'noowner') return 'warn';
  return 'muted';
}

export function ProjectPortfolioBadges({
  signals,
  merged,
}: {
  signals: ProjectSignals;
  merged?: MergedUiBadges | null;
}) {
  const visible = portfolioItems.filter((i) => i.show(signals));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((i) => {
        const label = merged
          ? merged.projectPortfolioSignal[i.key].label
          : i.label;
        const className = merged
          ? cn(
              chip,
              'font-normal',
              projectPortfolioSignalBadgeClass(merged, i.key),
            )
          : cn(chip, legacyVariantClass[legacyVariantForKey(i.key)]);
        return (
          <span key={i.key} className={className}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
