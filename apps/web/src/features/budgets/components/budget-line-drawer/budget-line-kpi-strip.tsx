'use client';

import React, { useId } from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import { formatAmount } from '../../lib/budget-formatters';
import {
  BUDGET_LABELS,
  BUDGET_LABEL_HINTS,
} from '../../lib/budget-display-labels';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  ChartLine,
  CircleDollarSign,
  HandCoins,
  Receipt,
  TrendingDown,
} from 'lucide-react';

function resolveLineLandingAmount(line: BudgetLine): number {
  return line.landingAmount ?? line.forecastAmount;
}

function KpiItem({
  label,
  value,
  subtitle,
  hint,
  icon,
  labelId,
  hintId,
  toneClass,
}: {
  label: string;
  value: string;
  subtitle?: string;
  hint?: string;
  icon: React.ReactNode;
  labelId: string;
  hintId?: string;
  toneClass?: string;
}) {
  return (
    <Card className="min-w-[168px] shadow-none bg-muted/10 border-border/60">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/80">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              id={labelId}
              className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </span>
            {subtitle ? (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
                {subtitle}
              </Badge>
            ) : null}
          </div>
          <div
            className={cn(
              'truncate text-sm font-semibold tabular-nums',
              toneClass,
            )}
            aria-labelledby={labelId}
            aria-describedby={hintId}
          >
            {value}
          </div>
          {hint ? (
            <p id={hintId} className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/** Bande KPI ligne — Budget → Atterrissage → Engagé → Consommé → Restant → Écart d'atterrissage. */
export function BudgetLineKpiStrip({
  line,
  className,
}: {
  line: BudgetLine;
  className?: string;
}) {
  const baseId = useId();
  const currency = line.currency;
  const budgetBase = line.initialAmount || 0;
  const landingAmount = resolveLineLandingAmount(line);
  const landingGap = landingAmount - budgetBase;
  const toPct = (num: number) =>
    budgetBase > 0 ? `${Math.round((num / budgetBase) * 100)}%` : '—';

  return (
    <div
      className={cn(
        'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      role="region"
      aria-label="Indicateurs de la ligne budgétaire"
    >
      <div className="flex w-max min-w-full items-stretch justify-center gap-2">
        <KpiItem
          label={BUDGET_LABELS.budget}
          value={formatAmount(line.initialAmount, currency)}
          icon={<Banknote className="size-4" />}
          labelId={`${baseId}-budget-label`}
        />
        <KpiItem
          label={BUDGET_LABELS.landing}
          subtitle={toPct(landingAmount)}
          hint={BUDGET_LABEL_HINTS.landing}
          value={formatAmount(landingAmount, currency)}
          icon={<ChartLine className="size-4" />}
          labelId={`${baseId}-landing-label`}
          hintId={`${baseId}-landing-hint`}
        />
        <KpiItem
          label={BUDGET_LABELS.committed}
          subtitle={toPct(line.committedAmount)}
          value={formatAmount(line.committedAmount, currency)}
          icon={<HandCoins className="size-4" />}
          labelId={`${baseId}-committed-label`}
        />
        <KpiItem
          label={BUDGET_LABELS.consumed}
          subtitle={toPct(line.consumedAmount)}
          value={formatAmount(line.consumedAmount, currency)}
          icon={<Receipt className="size-4" />}
          labelId={`${baseId}-consumed-label`}
        />
        <KpiItem
          label={BUDGET_LABELS.remaining}
          value={formatAmount(line.remainingAmount, currency)}
          icon={<CircleDollarSign className="size-4" />}
          labelId={`${baseId}-remaining-label`}
        />
        <KpiItem
          label={BUDGET_LABELS.landingGap}
          value={
            landingGap !== 0
              ? formatAmount(landingGap, currency)
              : '—'
          }
          hint={
            landingGap > 0
              ? `${BUDGET_LABELS.landing} au-delà du budget`
              : landingGap < 0
                ? `${BUDGET_LABELS.landing} sous le plafond`
                : `${BUDGET_LABELS.landing} aligné sur le budget`
          }
          icon={<TrendingDown className="size-4" />}
          labelId={`${baseId}-landing-gap-label`}
          hintId={`${baseId}-landing-gap-hint`}
          toneClass={
            landingGap > 0
              ? 'text-destructive'
              : landingGap < 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : undefined
          }
        />
      </div>
    </div>
  );
}
