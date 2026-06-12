import React from 'react';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  title: string;
  value: string;
  /** Période ou précision (ex. "Ce mois", "30 jours") — affiché en muted. */
  subtitle?: string;
  /** Évolution positive (ex. "+5 %") — affiché en vert. */
  trend?: string;
  icon?: React.ReactNode;
  /**
   * `dense` — grilles cockpit multi-KPI (portefeuille projets, tableaux de bord compacts).
   * `default` — carte hero (dashboard, détail budget).
   */
  variant?: 'default' | 'dense';
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}: KpiCardProps) {
  const dense = variant === 'dense';
  return (
    <div
      className={cn(
        'starium-kpi-card transition-shadow hover:shadow-[var(--ds-card-shadow-hover)]',
        dense && '!p-3',
      )}
    >
      <div className={cn('flex items-center', dense ? 'gap-3' : 'gap-[18px]')}>
        {icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center text-[color:var(--brand-gold)]',
              dense ? '[&_svg]:size-7' : '[&_svg]:size-[38px] [&_svg]:[stroke-width:1.5]',
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="starium-kpi-label block">{title}</span>
          <div
            className={cn(
              'starium-kpi-value text-foreground',
              dense && 'starium-kpi-value--dense',
            )}
          >
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
          {trend && (
            <div className="text-xs text-[color:var(--state-success)]">{trend}</div>
          )}
        </div>
      </div>
    </div>
  );
}
