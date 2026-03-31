'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { getCurrencySymbol } from '@/lib/currency-format';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { CockpitSurfaceCard } from './budget-cockpit-primitives';

export function BudgetMonthlyTrendCard({
  monthlyTrend,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  monthlyTrend: { month: string; committed: number; consumed: number }[];
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  const monthlyTaxHint =
    taxDisplayMode === 'HT'
      ? 'Montants HT — agrégation des montants HT des événements financiers.'
      : defaultTaxRate != null
        ? 'TTC approximatif (TVA client par défaut sur les montants HT des événements).'
        : 'Sans TVA par défaut, affichage en HT.';

  return (
    <CockpitSurfaceCard
      title="Évolution mensuelle"
      description={
        <>
          Engagé et consommé par mois (événements financiers).{' '}
          <span className="text-foreground">
            Devise {getCurrencySymbol(currency)} · {monthlyTaxHint}
          </span>
        </>
      }
      icon={BarChart3}
      accent="sky"
      className="md:col-span-2"
      contentPad={false}
      bodyClassName="p-0"
    >
      {monthlyTrend.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Aucune donnée sur la période.
        </p>
      ) : (
        <div className="max-h-56 divide-y divide-border/80 overflow-y-auto">
          {monthlyTrend.map((row) => (
            <div
              key={row.month}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
            >
              <span className="min-w-[7rem] font-medium text-muted-foreground">
                {row.month}
              </span>
              <span className="min-w-0 flex-1 text-right tabular-nums text-foreground">
                <span className="text-muted-foreground">E</span>{' '}
                {formatDashboardAmount({
                  ht: row.committed,
                  currency,
                  mode: taxDisplayMode,
                  defaultTaxRate,
                })}{' '}
                <span className="text-muted-foreground">·</span>{' '}
                <span className="text-muted-foreground">C</span>{' '}
                {formatDashboardAmount({
                  ht: row.consumed,
                  currency,
                  mode: taxDisplayMode,
                  defaultTaxRate,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </CockpitSurfaceCard>
  );
}
