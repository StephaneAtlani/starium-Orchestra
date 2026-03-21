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
        'flex flex-col transition-shadow hover:shadow-md',
        dense ? 'gap-1.5 p-3 shadow-sm' : 'gap-2 p-5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'font-medium leading-tight text-muted-foreground',
            dense ? 'text-xs' : 'text-sm',
          )}
        >
          {title}
        </span>
        {icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-accent text-primary',
              dense ? 'h-7 w-7 [&_svg]:size-3.5' : 'h-9 w-9',
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        className={cn(
          'tracking-tight tabular-nums text-foreground',
          dense ? 'text-xl font-semibold' : 'text-3xl font-bold',
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
      {trend && (
        <div className="text-xs text-emerald-600 dark:text-emerald-500">{trend}</div>
      )}
    </Card>
  );
}
