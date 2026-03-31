'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNumberFr } from '@/lib/currency-format';
import type { KpiAmountParts } from '@/features/budgets/lib/budget-dashboard-format';
import { useAnimatedNumber } from '@/hooks/use-animated-number';

export type BudgetKpiVisualVariant =
  | 'primary'
  | 'committed'
  | 'consumed'
  | 'liquidity'
  | 'forecast'
  | 'variance';

export type BudgetKpiAmountTone = 'default' | 'danger' | 'success' | 'warning';

const variantShell: Record<
  BudgetKpiVisualVariant,
  { ring: string; iconWrap: string; icon: string }
> = {
  primary: {
    ring: 'ring-1 ring-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card',
    iconWrap: 'border-primary/20 bg-primary/10 text-primary',
    icon: 'text-primary',
  },
  committed: {
    ring: 'ring-1 ring-sky-500/15 bg-gradient-to-br from-sky-500/[0.06] via-card to-card',
    iconWrap: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  consumed: {
    ring: 'ring-1 ring-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] via-card to-card',
    iconWrap: 'border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-300',
    icon: 'text-violet-700 dark:text-violet-400',
  },
  liquidity: {
    ring: 'ring-1 ring-amber-500/12 bg-gradient-to-br from-amber-500/[0.05] via-card to-card',
    iconWrap: 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200',
    icon: 'text-amber-700 dark:text-amber-400',
  },
  forecast: {
    ring: 'ring-1 ring-border bg-card',
    iconWrap: 'border-border bg-muted/80 text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  variance: {
    ring: 'ring-1 ring-border bg-card',
    iconWrap: 'border-border bg-muted/80 text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

const amountToneClass: Record<BudgetKpiAmountTone, string> = {
  default: 'text-foreground',
  danger: 'text-destructive',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
};

function KpiAmountBlock({
  parts,
  amountTone,
  amountDisplayValue,
  animateAmount,
}: {
  parts: KpiAmountParts;
  amountTone: BudgetKpiAmountTone;
  /** Montant affiché (HT ou TTC selon le mode) — pour animation cohérente avec `parts`. */
  amountDisplayValue?: number;
  animateAmount?: boolean;
}) {
  const animated = useAnimatedNumber(amountDisplayValue ?? 0, {
    enabled: Boolean(animateAmount && amountDisplayValue != null),
  });
  const amountLabel =
    animateAmount && amountDisplayValue != null
      ? formatNumberFr(Math.round(animated))
      : parts.amount;

  return (
    <div className="mt-3 min-h-[2.75rem]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {parts.approx ? (
          <span
            className="text-lg font-medium leading-none text-muted-foreground"
            aria-hidden
          >
            ≈
          </span>
        ) : null}
        <span
          className={cn(
            'text-3xl font-semibold tabular-nums tracking-tight',
            amountToneClass[amountTone],
          )}
          aria-live={animateAmount ? 'polite' : undefined}
        >
          {amountLabel}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {parts.currency}
        </span>
        <Badge
          variant="outline"
          className="h-5 border-border px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {parts.taxTag}
        </Badge>
      </div>
    </div>
  );
}

export function BudgetKpiCard({
  label,
  description,
  parts,
  subtext,
  icon: Icon,
  dataTestId,
  variant,
  amountTone = 'default',
  amountDisplayValue,
  animateAmount,
}: {
  label: string;
  /** Sous-titre court sous le libellé (optionnel) */
  description?: string;
  parts: KpiAmountParts;
  subtext?: string;
  icon?: LucideIcon;
  dataTestId?: string;
  variant: BudgetKpiVisualVariant;
  amountTone?: BudgetKpiAmountTone;
  amountDisplayValue?: number;
  animateAmount?: boolean;
}) {
  const shell = variantShell[variant];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border p-4 shadow-sm transition-shadow hover:shadow-md',
        shell.ring,
      )}
      data-testid={dataTestId}
    >
      <div className="flex gap-3">
        {Icon ? (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              shell.iconWrap,
            )}
            aria-hidden
          >
            <Icon className={cn('h-5 w-5', shell.icon)} strokeWidth={1.75} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-snug text-foreground">
              {label}
            </span>
            {description ? (
              <span className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
            ) : null}
          </div>
          <KpiAmountBlock
            parts={parts}
            amountTone={amountTone}
            amountDisplayValue={amountDisplayValue}
            animateAmount={animateAmount}
          />
          {subtext ? (
            <p className="mt-2 border-t border-border/60 pt-2 text-xs leading-relaxed text-muted-foreground">
              {subtext}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
