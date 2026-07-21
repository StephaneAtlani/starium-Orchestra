'use client';

import { cn } from '@/lib/utils';

export type AlertSeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';

/** Pastille compacte — alignée cockpit budget / forecast (contraste AA). */
const chip =
  'inline-flex min-h-[1.375rem] shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none';

const ALERT_SEVERITY_STYLES: Record<AlertSeverityLevel, string> = {
  CRITICAL:
    'border-destructive/35 bg-destructive/[0.08] text-destructive dark:border-destructive/50 dark:bg-destructive/15',
  WARNING:
    'border-amber-300/80 bg-amber-50 !text-foreground dark:border-amber-400/40 dark:bg-amber-100/90 dark:!text-foreground',
  INFO: 'border-border bg-muted/70 text-muted-foreground',
};

const ALERT_SEVERITY_LABELS: Record<AlertSeverityLevel, string> = {
  CRITICAL: 'Critique',
  WARNING: 'Attention',
  INFO: 'Info',
};

export function AlertSeverityBadge({
  severity,
  className,
}: {
  severity: AlertSeverityLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(chip, ALERT_SEVERITY_STYLES[severity], className)}
      data-severity={severity.toLowerCase()}
    >
      {ALERT_SEVERITY_LABELS[severity]}
    </span>
  );
}
