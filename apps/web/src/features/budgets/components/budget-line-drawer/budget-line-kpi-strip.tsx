'use client';

import React from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import { formatAmount } from '../../lib/budget-formatters';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function KpiTile({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {subtitle ? (
            <span className="text-[11px] tabular-nums text-muted-foreground">{subtitle}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-lg font-semibold tracking-tight tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export function BudgetLineKpiStrip({
  line,
  className,
}: {
  line: BudgetLine;
  className?: string;
}) {
  const currency = line.currency;
  const revised = line.revisedAmount || 0;
  const toPct = (num: number) =>
    revised > 0 ? `${Math.round((num / revised) * 100)}%` : '—';

  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        className,
      )}
    >
      <KpiTile label="Initial" value={formatAmount(line.initialAmount, currency)} />
      <KpiTile label="Révisé" value={formatAmount(line.revisedAmount, currency)} />
      <KpiTile
        label="Forecast"
        subtitle={toPct(line.forecastAmount)}
        value={formatAmount(line.forecastAmount, currency)}
      />
      <KpiTile
        label="Engagé"
        subtitle={toPct(line.committedAmount)}
        value={formatAmount(line.committedAmount, currency)}
      />
      <KpiTile
        label="Consommé"
        subtitle={toPct(line.consumedAmount)}
        value={formatAmount(line.consumedAmount, currency)}
      />
      <KpiTile label="Restant" value={formatAmount(line.remainingAmount, currency)} />
    </div>
  );
}

