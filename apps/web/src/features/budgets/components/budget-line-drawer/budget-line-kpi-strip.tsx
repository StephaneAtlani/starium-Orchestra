'use client';

import React from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import { formatAmount } from '../../lib/budget-formatters';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  ChartLine,
  CircleDollarSign,
  HandCoins,
  Receipt,
} from 'lucide-react';

function KpiItem({
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
    <Card className="min-w-[168px] shadow-none bg-muted/10 border-border/60">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/80">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            {subtitle ? (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
                {subtitle}
              </Badge>
            ) : null}
          </div>
          <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
        </div>
      </div>
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
  const budgetBase = line.initialAmount || 0;
  const toPct = (num: number) =>
    budgetBase > 0 ? `${Math.round((num / budgetBase) * 100)}%` : '—';

  return (
    <div
      className={cn(
        'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <div className="flex w-max min-w-full items-stretch justify-center gap-2">
        <KpiItem
          label="Budget"
          value={formatAmount(line.initialAmount, currency)}
          icon={<Banknote className="size-4" />}
        />
        <KpiItem
          label="Forecast"
          subtitle={toPct(line.forecastAmount)}
          value={formatAmount(line.forecastAmount, currency)}
          icon={<ChartLine className="size-4" />}
        />
        <KpiItem
          label="Engagé"
          subtitle={toPct(line.committedAmount)}
          value={formatAmount(line.committedAmount, currency)}
          icon={<HandCoins className="size-4" />}
        />
        <KpiItem
          label="Consommé"
          subtitle={toPct(line.consumedAmount)}
          value={formatAmount(line.consumedAmount, currency)}
          icon={<Receipt className="size-4" />}
        />
        <KpiItem
          label="Restant"
          value={formatAmount(line.remainingAmount, currency)}
          icon={<CircleDollarSign className="size-4" />}
        />
      </div>
    </div>
  );
}

