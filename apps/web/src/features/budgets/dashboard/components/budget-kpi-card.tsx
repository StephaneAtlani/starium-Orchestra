'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cockpitCardClass } from './budget-dashboard-shell';

export function BudgetKpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  dataTestId,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: LucideIcon;
  dataTestId?: string;
}) {
  return (
    <Card className={cockpitCardClass} data-testid={dataTestId}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon ? (
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : null}
        </div>
        <div className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </div>
        {subtext ? (
          <div className="text-xs text-muted-foreground">{subtext}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
