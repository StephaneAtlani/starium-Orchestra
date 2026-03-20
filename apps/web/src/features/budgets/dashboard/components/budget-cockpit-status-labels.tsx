'use client';

import { cn } from '@/lib/utils';

/** Pastille table — sobre, pas de pilule arrondie type Badge shadcn */
const chip =
  'inline-flex min-h-[1.375rem] items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none';

export function EnvelopeRiskLabel({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const styles: Record<typeof level, string> = {
    HIGH:
      'border-destructive/35 bg-destructive/[0.08] text-destructive dark:border-destructive/50 dark:bg-destructive/15',
    MEDIUM:
      'border-amber-500/40 bg-amber-500/[0.12] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100',
    LOW: 'border-border bg-muted/70 text-muted-foreground',
  };
  const labels: Record<typeof level, string> = {
    HIGH: 'Haut',
    MEDIUM: 'Moyen',
    LOW: 'Bas',
  };
  return (
    <span className={cn(chip, styles[level])} data-risk={level.toLowerCase()}>
      {labels[level]}
    </span>
  );
}

export function LineSeverityLabel({
  level,
}: {
  level: 'CRITICAL' | 'WARNING' | 'OK';
}) {
  const styles: Record<typeof level, string> = {
    CRITICAL:
      'border-destructive/35 bg-destructive/[0.08] text-destructive dark:border-destructive/50 dark:bg-destructive/15',
    WARNING:
      'border-amber-500/40 bg-amber-500/[0.12] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100',
    OK: 'border-border bg-muted/70 text-muted-foreground',
  };
  const labels: Record<typeof level, string> = {
    CRITICAL: 'Critique',
    WARNING: 'Attention',
    OK: 'OK',
  };
  return (
    <span className={cn(chip, styles[level])} data-severity={level.toLowerCase()}>
      {labels[level]}
    </span>
  );
}
