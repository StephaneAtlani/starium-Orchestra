'use client';

import React from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import { formatAmount } from '../../lib/budget-formatters';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  ChartLine,
  CircleDollarSign,
  HandCoins,
  PiggyBank,
  Receipt,
} from 'lucide-react';

function KpiTile({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card
      size="sm"
      className="shadow-none border-border/60 bg-gradient-to-b from-background to-muted/20 hover:to-muted/30 transition-colors"
    >
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              {icon}
            </div>
            <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          {subtitle ? <Badge variant="outline" className="tabular-nums">{subtitle}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xl font-semibold tracking-tight tabular-nums">{value}</div>
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
      <KpiTile
        label="Initial"
        value={formatAmount(line.initialAmount, currency)}
        icon={<PiggyBank className="size-4" />}
      />
      <KpiTile
        label="Révisé"
        value={formatAmount(line.revisedAmount, currency)}
        icon={<Banknote className="size-4" />}
      />
      <KpiTile
        label="Forecast"
        subtitle={toPct(line.forecastAmount)}
        value={formatAmount(line.forecastAmount, currency)}
        icon={<ChartLine className="size-4" />}
      />
      <KpiTile
        label="Engagé"
        subtitle={toPct(line.committedAmount)}
        value={formatAmount(line.committedAmount, currency)}
        icon={<HandCoins className="size-4" />}
      />
      <KpiTile
        label="Consommé"
        subtitle={toPct(line.consumedAmount)}
        value={formatAmount(line.consumedAmount, currency)}
        icon={<Receipt className="size-4" />}
      />
      <KpiTile
        label="Restant"
        value={formatAmount(line.remainingAmount, currency)}
        icon={<CircleDollarSign className="size-4" />}
      />
    </div>
  );
}

