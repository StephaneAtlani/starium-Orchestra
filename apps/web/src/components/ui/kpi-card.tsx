import React from 'react';
import { Card } from '@/components/ui/card';
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
    <Card
      className={cn(
        'transition-shadow hover:shadow-[var(--shadow-2)]',
        dense ? 'p-3' : 'p-5',
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
          <span className="block text-[13px] leading-tight text-muted-foreground">
            {title}
          </span>
          <div
            className={cn(
              'tracking-tight tabular-nums text-foreground',
              dense ? 'text-xl font-bold' : 'text-3xl font-bold',
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
    </Card>
  );
}
