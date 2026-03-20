'use client';

import React from 'react';
import {
  ArrowDownRight,
  PiggyBank,
  Scale,
  TrendingDown,
  Wallet,
  Waypoints,
} from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import {
  formatForecastGapParts,
  formatKpiAmountParts,
} from '@/features/budgets/lib/budget-dashboard-format';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { BudgetKpiCard, type BudgetKpiAmountTone } from './budget-kpi-card';

export function BudgetKpiGrid({
  data,
  taxDisplayMode,
  defaultTaxRate,
}: {
  data: BudgetDashboardResponse;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  const { kpis, budget } = data;
  const c = budget.currency;

  const ecartForecast = kpis.forecast - kpis.totalBudget;
  const gapParts = formatForecastGapParts(kpis, c, taxDisplayMode, defaultTaxRate);
  const ecartSub =
    ecartForecast >= 0
      ? 'Le forecast dépasse le budget révisé sur cette base.'
      : 'Le forecast reste sous le plafond budgétaire révisé.';

  const remainingTone: BudgetKpiAmountTone =
    kpis.remaining < 0 ? 'danger' : kpis.remaining > 0 ? 'success' : 'default';

  const gapTone: BudgetKpiAmountTone =
    ecartForecast > 0 ? 'warning' : ecartForecast < 0 ? 'success' : 'default';

  const fmt = (p: Parameters<typeof formatKpiAmountParts>[0]) =>
    formatKpiAmountParts(p);

  return (
    <section aria-labelledby="budget-kpi-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="budget-kpi-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Synthèse financière
          </h2>
          <p className="text-sm text-muted-foreground">
            Montants du budget actif · taux de consommation{' '}
            <span className="font-medium tabular-nums text-foreground">
              {formatPercent(kpis.consumptionRate)}
            </span>
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4"
        data-testid="budget-dashboard-kpis"
      >
        <BudgetKpiCard
          variant="primary"
          label="Budget révisé"
          description="Plafond de référence"
          parts={fmt({
            ht: kpis.totalBudget,
            ttcFromApi: kpis.totalBudgetTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Wallet}
          dataTestId="kpi-total-budget"
        />

        <BudgetKpiCard
          variant="committed"
          label="Engagé"
          description="Commandes & engagements"
          parts={fmt({
            ht: kpis.committed,
            ttcFromApi: kpis.committedTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Waypoints}
          dataTestId="kpi-committed"
        />

        <BudgetKpiCard
          variant="consumed"
          label="Consommé"
          description="Réalisé (facturé / imputé)"
          parts={fmt({
            ht: kpis.consumed,
            ttcFromApi: kpis.consumedTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={ArrowDownRight}
          dataTestId="kpi-consumed"
        />

        <BudgetKpiCard
          variant="liquidity"
          label="Disponible"
          description="Reste à engager / consommer"
          parts={fmt({
            ht: kpis.remaining,
            ttcFromApi: kpis.remainingTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={PiggyBank}
          amountTone={remainingTone}
          dataTestId="kpi-remaining"
        />

        <BudgetKpiCard
          variant="forecast"
          label="Forecast"
          description="Projection à date"
          parts={fmt({
            ht: kpis.forecast,
            ttcFromApi: kpis.forecastTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Scale}
          dataTestId="kpi-forecast"
        />

        <BudgetKpiCard
          variant="variance"
          label="Écart forecast"
          description="Forecast − budget révisé"
          parts={gapParts}
          subtext={ecartSub}
          icon={TrendingDown}
          amountTone={gapTone}
          dataTestId="kpi-forecast-gap"
        />
      </div>
    </section>
  );
}
