import React from 'react';
import { Card } from '@/components/ui/card';

export interface KpiCardProps {
  title: string;
  value: string;
  /** Période ou précision (ex. "Ce mois", "30 jours") — affiché en muted. */
  subtitle?: string;
  /** Évolution positive (ex. "+5 %") — affiché en vert. */
  trend?: string;
  icon?: React.ReactNode;
}

export function KpiCard({ title, value, subtitle, trend, icon }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-2 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
      {trend && (
        <div className="text-xs text-emerald-600">{trend}</div>
      )}
    </Card>
  );
}
