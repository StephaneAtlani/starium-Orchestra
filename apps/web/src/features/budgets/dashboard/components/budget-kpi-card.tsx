'use client';

import React from 'react';
import Link from 'next/link';
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

/**
 * Design System Starium (charte) : carte KPI = surface plate, icône dorée
 * standalone (sans carré), valeur display. La teinte d'icône porte la catégorie.
 */
const variantShell: Record<BudgetKpiVisualVariant, { icon: string }> = {
  primary: { icon: 'text-[color:var(--brand-gold)]' },
  committed: { icon: 'text-sky-600 dark:text-sky-400' },
  consumed: { icon: 'text-violet-600 dark:text-violet-400' },
  liquidity: { icon: 'text-amber-600 dark:text-amber-400' },
  forecast: { icon: 'text-muted-foreground' },
  variance: { icon: 'text-muted-foreground' },
};

const amountToneClass: Record<BudgetKpiAmountTone, string> = {
  default: 'text-foreground',
  danger: 'text-destructive',
  success: 'text-[color:var(--state-success)]',
  warning: 'text-[color:var(--state-warning)]',
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
  href,
  linkAriaLabel,
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
  /** Si défini, la carte devient un lien cliquable vers le détail. */
  href?: string;
  linkAriaLabel?: string;
}) {
  const shell = variantShell[variant];
  const shellClassName = cn(
    'starium-kpi-card',
    href && 'starium-kpi-card--interactive',
  );
  const ariaLabel =
    linkAriaLabel ??
    (href ? `${label}${description ? ` — ${description}` : ''} — voir le détail` : undefined);

  const content = (
    <div className="flex items-center gap-[18px]">
      {Icon ? (
        <Icon
          className={cn('size-[38px] shrink-0', shell.icon)}
          strokeWidth={1.5}
          aria-hidden
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] leading-snug text-muted-foreground">
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
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(shellClassName, 'group block')}
        data-testid={dataTestId}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={shellClassName} data-testid={dataTestId}>
      {content}
    </div>
  );
}
