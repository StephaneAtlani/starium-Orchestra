'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HomeDashboardSparkline } from './home-dashboard-sparkline';

export type HomeKpiBadgeTone = 'success' | 'danger' | 'muted';

type Props = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  iconWrapperClassName: string;
  sparkStroke: string;
  sparkFill: string;
  /** Série dynamique uniquement (≥ 2 points) — sinon pas de sparkline. */
  sparkValues?: number[] | null;
  sparkLabels?: string[];
  formatSparkValue?: (n: number) => string;
  badge?: { label: string; tone: HomeKpiBadgeTone };
  href?: string;
};

const badgeToneClass: Record<HomeKpiBadgeTone, string> = {
  success:
    'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]',
  danger: 'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]',
  muted: 'bg-muted text-muted-foreground',
};

/**
 * KPI compact maquette — 4 cartes sur une ligne desktop.
 */
export function HomeDashboardKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconWrapperClassName,
  sparkStroke,
  sparkFill,
  sparkValues,
  sparkLabels,
  formatSparkValue,
  badge,
  href,
}: Props) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4',
            iconWrapperClassName,
          )}
        >
          <Icon aria-hidden strokeWidth={1.75} />
        </div>
        {badge ? (
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[0.625rem] font-semibold leading-none tabular-nums',
              badgeToneClass[badge.tone],
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <p className="starium-kpi-label mt-2">{title}</p>
      <p className="starium-kpi-value starium-kpi-value--dense mt-0.5 text-foreground">
        {value}
      </p>
      <p className="starium-text-muted mt-0.5 truncate text-[0.6875rem] leading-snug">
        {subtitle}
      </p>

      <div className="mt-auto min-h-6 pt-2">
        {sparkValues && sparkValues.length >= 2 ? (
          <HomeDashboardSparkline
            values={sparkValues}
            labels={sparkLabels}
            formatValue={formatSparkValue}
            stroke={sparkStroke}
            fill={sparkFill}
            label={`Tendance ${title}`}
          />
        ) : null}
      </div>
    </>
  );

  const shell = cn(
    'starium-kpi-card !justify-start !p-3',
    href && 'starium-kpi-card--interactive',
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(shell, 'group flex h-full min-h-0 flex-col')}
        aria-label={`${title} : ${value} — voir le détail`}
      >
        {body}
      </Link>
    );
  }

  return <div className={cn(shell, 'flex h-full flex-col')}>{body}</div>;
}
