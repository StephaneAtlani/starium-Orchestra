'use client';

import { cn } from '@/lib/utils';
import type { ProjectListItem, ProjectSignals } from '../types/project.types';

const chip =
  'inline-flex min-h-[1.375rem] items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none';

export function HealthBadge({ health }: { health: ProjectListItem['computedHealth'] }) {
  const styles: Record<typeof health, string> = {
    RED: 'border-destructive/35 bg-destructive/[0.08] text-destructive',
    ORANGE:
      'border-amber-300/80 bg-amber-50 text-[#1c1917] dark:border-amber-400/40 dark:bg-amber-100/90',
    GREEN: 'border-border bg-muted/70 text-muted-foreground',
  };
  const labels: Record<typeof health, string> = {
    RED: 'Santé : critique',
    ORANGE: 'Santé : attention',
    GREEN: 'Santé : bon',
  };
  return (
    <span className={cn(chip, styles[health])} data-health={health.toLowerCase()}>
      {labels[health]}
    </span>
  );
}

export function ProjectPortfolioBadges({ signals }: { signals: ProjectSignals }) {
  const items: { key: string; label: string; show: boolean; variant: 'danger' | 'warn' | 'muted' }[] =
    [
      { key: 'late', label: 'En retard', show: signals.isLate, variant: 'danger' },
      { key: 'blocked', label: 'Bloqué', show: signals.isBlocked, variant: 'danger' },
      { key: 'critical', label: 'Critique', show: signals.isCritical, variant: 'danger' },
      { key: 'norisk', label: 'Sans risque', show: signals.hasNoRisks, variant: 'warn' },
      { key: 'noowner', label: 'Sans owner', show: signals.hasNoOwner, variant: 'warn' },
    ];

  const variantClass: Record<typeof items[number]['variant'], string> = {
    danger:
      'border-destructive/35 bg-destructive/[0.08] text-destructive dark:border-destructive/50 dark:bg-destructive/15',
    warn: 'border-amber-300/80 bg-amber-50 text-[#1c1917] dark:border-amber-400/40 dark:bg-amber-100/90',
    muted: 'border-border bg-muted/70 text-muted-foreground',
  };

  const visible = items.filter((i) => i.show);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((i) => (
        <span key={i.key} className={cn(chip, variantClass[i.variant])}>
          {i.label}
        </span>
      ))}
    </div>
  );
}
