'use client';

import React from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import { BudgetRunBuildCard } from './budget-run-build-card';

export function BudgetAnalyticsGrid({
  data,
  taxDisplayMode,
  defaultTaxRate,
}: {
  data: BudgetDashboardResponse;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  const { capexOpexDistribution, monthlyTrend, budget, runBuildDistribution } =
    data;
  const c = budget.currency;

  const monthlyTaxHint =
    taxDisplayMode === 'HT'
      ? 'Montants HT — agrégation des montants HT des événements.'
      : defaultTaxRate != null
        ? 'TTC approximatif (TVA client par défaut sur les montants HT des événements).'
        : 'Sans TVA par défaut, affichage en HT.';

  return (
    <CockpitSection
      id="budget-analytics-heading"
      title="Répartition & tendances"
      description="Structure du budget révisé et dynamique mensuelle des événements financiers."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BudgetRunBuildCard
          distribution={runBuildDistribution}
          currency={c}
          taxDisplayMode={taxDisplayMode}
          defaultTaxRate={defaultTaxRate}
        />

        <CockpitSurfaceCard
          title="CAPEX / OPEX"
          description="Montants budgétés (révisés) par type de dépense"
          icon={PieChart}
          accent="violet"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">CAPEX</span>
              <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                {formatDashboardAmount({
                  ht: capexOpexDistribution.capex,
                  currency: c,
                  mode: taxDisplayMode,
                  defaultTaxRate,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">OPEX</span>
              <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                {formatDashboardAmount({
                  ht: capexOpexDistribution.opex,
                  currency: c,
                  mode: taxDisplayMode,
                  defaultTaxRate,
                })}
              </span>
            </div>
          </div>
        </CockpitSurfaceCard>

        <CockpitSurfaceCard
          title="Évolution mensuelle"
          description={
            <>
              Engagé et consommé par mois (événements financiers).{' '}
              <span className="text-foreground">
                Devise {c} · {monthlyTaxHint}
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
                      currency: c,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}{' '}
                    <span className="text-muted-foreground">·</span>{' '}
                    <span className="text-muted-foreground">C</span>{' '}
                    {formatDashboardAmount({
                      ht: row.consumed,
                      currency: c,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CockpitSurfaceCard>
      </div>
    </CockpitSection>
  );
}
