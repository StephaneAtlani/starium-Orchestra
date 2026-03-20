'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { cockpitCardClass } from './budget-dashboard-shell';
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
      ? 'montants HT (agrégation des montants HT des événements).'
      : defaultTaxRate != null
        ? 'TTC approximatif (TVA client par défaut appliquée aux montants HT des événements).'
        : 'TTC indisponible sans TVA par défaut — affichage HT.';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BudgetRunBuildCard
        distribution={runBuildDistribution}
        currency={c}
        taxDisplayMode={taxDisplayMode}
        defaultTaxRate={defaultTaxRate}
      />

      <Card className={cockpitCardClass}>
        <CardHeader>
          <CardTitle className="text-base">CAPEX / OPEX</CardTitle>
          <CardDescription>
            Montants budgétés (révisés) par type de dépense
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">CAPEX</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatDashboardAmount({
                ht: capexOpexDistribution.capex,
                currency: c,
                mode: taxDisplayMode,
                defaultTaxRate,
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">OPEX</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatDashboardAmount({
                ht: capexOpexDistribution.opex,
                currency: c,
                mode: taxDisplayMode,
                defaultTaxRate,
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className={`${cockpitCardClass} md:col-span-2`}>
        <CardHeader>
          <CardTitle className="text-base">Évolution mensuelle</CardTitle>
          <CardDescription>
            Engagé et consommé par mois (événements financiers).{' '}
            <span className="text-foreground">
              Devise {c} · {monthlyTaxHint}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {monthlyTrend.map((row) => (
                <div
                  key={row.month}
                  className="flex justify-between gap-2 text-sm text-foreground"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {row.month}
                  </span>
                  <span className="min-w-0 text-right tabular-nums text-foreground">
                    E:{' '}
                    {formatDashboardAmount({
                      ht: row.committed,
                      currency: c,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}{' '}
                    · C:{' '}
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
        </CardContent>
      </Card>
    </div>
  );
}
