'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(rate: number | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${Math.round(rate * 100)} %`;
}

function getAlertLabel(row: BudgetListItemWithKpi): string | null {
  if (row.kpi.forecastGapAmount != null && row.kpi.forecastGapAmount > 0) {
    return 'Atterrissage au-dessus du budget';
  }
  if ((row.kpi.overConsumedLineCount ?? 0) > 0) {
    return 'Lignes en sur-consommation';
  }
  if ((row.kpi.overCommittedLineCount ?? 0) > 0) {
    return 'Lignes en sur-engagement';
  }
  return null;
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

        return (
          <Link
            key={row.budget.id}
            href={budgetDetail(row.budget.id)}
            className={cn(
              'group flex min-h-11 flex-col rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-[var(--shadow-1)] transition-all',
              'hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]',
            )}
            aria-label={`Ouvrir le budget ${row.budget.name}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]">
                <BriefcaseBusiness className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-foreground">
                  {row.budget.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{row.budget.code ?? 'Sans code'}</span>
                  <span aria-hidden>·</span>
                  <span>{currency}</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Budget alloué
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatAmount(row.kpi.totalInitialAmount, currency)}
              </div>
            </div>

            <div className="mt-4">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    (row.kpi.consumptionRate ?? 0) >= 1
                      ? 'bg-destructive'
                      : 'bg-[color:var(--brand-gold)]',
                  )}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, Math.round((row.kpi.consumptionRate ?? 0) * 100)),
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Exécution</span>
                <span className="tabular-nums text-foreground">
                  {formatPercent(row.kpi.consumptionRate)}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
              <div>
                <div className="text-xs text-muted-foreground">Engagé</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(row.kpi.totalCommittedAmount, currency)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Consommé</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(row.kpi.totalConsumedAmount, currency)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex min-h-11 min-w-0 items-center gap-2 text-xs font-semibold">
                {alertLabel ? (
                  <>
                    <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
                    <span className="truncate text-destructive">{alertLabel}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                    <span className="truncate text-emerald-700 dark:text-emerald-400">
                      Reste {formatAmount(row.kpi.totalRemainingAmount, currency)}
                    </span>
                  </>
                )}
              </div>
              <span className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[color:var(--brand-gold-700)]">
                Ouvrir
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
