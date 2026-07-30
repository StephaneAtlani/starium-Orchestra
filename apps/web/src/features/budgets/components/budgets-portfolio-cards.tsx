'use client';

import { AlertTriangle, ArrowRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PortfolioEntityCard,
  PortfolioProgressBar,
  rateToPercent,
  toneAmountClass,
  toneBadgeClass,
  type StatusTone,
} from '@/components/portfolio';
import { EntityVisualMark } from '@/components/ui/entity-visual-mark';
import { BudgetStatusBadge } from './budget-status-badge';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';
import { formatBudgetAmount, isBudgetRowAlert } from '../lib/budget-portfolio-format';
import {
  budgetExecutionTone,
  budgetPortfolioSubtitle,
} from '../lib/budget-portfolio-display';

function getAlertLabel(row: BudgetListItemWithKpi): string | null {
  if (row.kpi.forecastGapAmount != null && row.kpi.forecastGapAmount > 0) {
    return `Dépassement +${formatBudgetAmount(row.kpi.forecastGapAmount, row.kpi.currency ?? row.budget.currency)}`;
  }
  if ((row.kpi.overConsumedLineCount ?? 0) > 0) {
    return 'Lignes en sur-consommation';
  }
  if ((row.kpi.overCommittedLineCount ?? 0) > 0) {
    return 'Lignes en sur-engagement';
  }
  if (row.kpi.totalRemainingAmount < 0) {
    return `Dépassement +${formatBudgetAmount(Math.abs(row.kpi.totalRemainingAmount), row.kpi.currency ?? row.budget.currency)}`;
  }
  return null;
}

function budgetCardTone(row: BudgetListItemWithKpi): StatusTone {
  if (isBudgetRowAlert(row) || getAlertLabel(row)) return 'danger';
  return budgetExecutionTone(row.kpi.consumptionRate);
}

export function BudgetsPortfolioCards({
  items,
}: {
  items: BudgetListItemWithKpi[];
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      data-testid="budgets-portfolio-cards"
    >
      {items.map((row) => {
        const alertLabel = getAlertLabel(row);
        const currency = row.kpi.currency ?? row.budget.currency;
        const tone = budgetCardTone(row);
        const execPercent = rateToPercent(row.kpi.consumptionRate);
        const remainingTone: StatusTone =
          row.kpi.totalRemainingAmount < 0 ? 'danger' : 'ok';
        return (
          <PortfolioEntityCard
            key={row.budget.id}
            href={budgetDetail(row.budget.id)}
            ariaLabel={`Ouvrir le budget ${row.budget.name}`}
            tone={tone}
            icon={<EntityVisualMark visual={row.budget.visual} size="lg" label={budgetPortfolioSubtitle(row)} />}
            title={<span className="line-clamp-2">{row.budget.name}</span>}
            badges={
              <>
                <BudgetStatusBadge
                  status={row.budget.status}
                  className={cn(
                    'rounded-full px-2 py-px text-[11px] font-semibold',
                    toneBadgeClass(tone === 'danger' ? 'danger' : 'muted'),
                  )}
                />
              </>
            }
            subtitle={
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{budgetPortfolioSubtitle(row)}</span>
                <span aria-hidden>·</span>
                <span>{currency}</span>
              </span>
            }
            metric={
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Budget alloué
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {formatBudgetAmount(row.kpi.totalInitialAmount, currency)}
                </div>
                <div className="mt-3">
                  <PortfolioProgressBar
                    value={execPercent}
                    tone={budgetExecutionTone(row.kpi.consumptionRate)}
                    showPercent
                    label={`Exécution ${row.budget.name}`}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Consommé</span>
                    <span className={cn('tabular-nums', toneAmountClass('info'))}>
                      {formatBudgetAmount(row.kpi.totalConsumedAmount, currency)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Engagé</div>
                    <div className={cn('mt-1 text-sm font-semibold tabular-nums', toneAmountClass('brand'))}>
                      {formatBudgetAmount(row.kpi.totalCommittedAmount, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Reste</div>
                    <div
                      className={cn(
                        'mt-1 text-sm font-semibold tabular-nums',
                        toneAmountClass(remainingTone),
                      )}
                    >
                      {formatBudgetAmount(row.kpi.totalRemainingAmount, currency)}
                    </div>
                  </div>
                </div>
              </div>
            }
            footer={
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-h-11 min-w-0 items-center gap-2 text-xs font-semibold">
                  {alertLabel ? (
                    <>
                      <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
                      <span className="truncate text-destructive">{alertLabel}</span>
                    </>
                  ) : (
                    <>
                      <Wallet
                        className={cn('size-4 shrink-0', toneAmountClass('ok'))}
                        aria-hidden
                      />
                      <span className={cn('truncate', toneAmountClass('ok'))}>
                        Reste {formatBudgetAmount(row.kpi.totalRemainingAmount, currency)}
                      </span>
                    </>
                  )}
                </div>
                <span className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[color:var(--brand-gold-700)]">
                  Ouvrir
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
