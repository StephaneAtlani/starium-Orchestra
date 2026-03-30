'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ForecastLineStatus } from '@/features/budgets/types/budget-forecast.types';

const VARIANT: Record<ForecastLineStatus, string> = {
  OK: 'border-border bg-muted/60 text-muted-foreground',
  WARNING: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  CRITICAL: 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
};

/** Exposé pour tests (classes attendues par statut). */
export function forecastStatusToneClass(status: ForecastLineStatus): string {
  return VARIANT[status];
}

export function ForecastStatusBadge({
  status,
  className,
}: {
  status: ForecastLineStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        forecastStatusToneClass(status),
        className,
      )}
      data-testid={`forecast-status-${status}`}
    >
      {status}
    </span>
  );
}
