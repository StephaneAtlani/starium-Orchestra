'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SynthesisListKpis({
  children,
  className,
  columns = 4,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
  'aria-label'?: string;
}) {
  return (
    <div
      className={cn('starium-list-kpis', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function SynthesisListKpi({
  icon,
  iconClassName,
  label,
  value,
  valueClassName,
  sub,
  subClassName,
}: {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  sub?: ReactNode;
  subClassName?: string;
}) {
  return (
    <article className="starium-list-kpi">
      <div className={cn('starium-list-kpi__ico', iconClassName)} aria-hidden>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="starium-list-kpi__label">{label}</p>
        <p className={cn('starium-list-kpi__num', valueClassName)}>{value}</p>
        {sub != null ? (
          <p className={cn('starium-list-kpi__sub', subClassName)}>{sub}</p>
        ) : null}
      </div>
    </article>
  );
}
