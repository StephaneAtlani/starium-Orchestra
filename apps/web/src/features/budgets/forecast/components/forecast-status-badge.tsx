'use client';

import React from 'react';
import {
  LINE_SEVERITY_STYLES,
  LineSeverityLabel,
} from '@/features/budgets/dashboard/components/budget-cockpit-status-labels';
import { cn } from '@/lib/utils';
import type { ForecastLineStatus } from '@/features/budgets/types/budget-forecast.types';

/** Exposé pour tests (classes alignées cockpit / gestion). */
export function forecastStatusToneClass(status: ForecastLineStatus): string {
  return LINE_SEVERITY_STYLES[status];
}

export function ForecastStatusBadge({
  status,
  className,
  title,
}: {
  status: ForecastLineStatus;
  className?: string;
  /** Infobulle (règle métier : pourquoi ce statut). */
  title?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center', className)}
      data-testid={`forecast-status-${status}`}
      title={title}
    >
      <LineSeverityLabel level={status} />
    </span>
  );
}
