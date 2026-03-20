'use client';

import React from 'react';
import { TrendingDown, Wallet } from 'lucide-react';
import { formatAmount } from '@/features/budgets/lib/budget-formatters';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { BudgetKpiCard } from './budget-kpi-card';

export function BudgetKpiGrid({
  data,
}: {
  data: BudgetDashboardResponse;
}) {
  const { kpis, budget } = data;
  const ecartForecast = kpis.forecast - kpis.totalBudget;
  const ecartStr = formatAmount(ecartForecast, budget.currency);
  const ecartSub =
    ecartForecast >= 0 ? 'Forecast au-dessus du budget révisé' : 'Sous le budget révisé';

  return (
    <section
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      data-testid="budget-dashboard-kpis"
    >
      <BudgetKpiCard
        label="Budget révisé"
        value={formatAmount(kpis.totalBudget, budget.currency)}
        icon={Wallet}
        dataTestId="kpi-total-budget"
      />
      <BudgetKpiCard
        label="Engagé"
        value={formatAmount(kpis.committed, budget.currency)}
        dataTestId="kpi-committed"
      />
      <BudgetKpiCard
        label="Consommé"
        value={formatAmount(kpis.consumed, budget.currency)}
        dataTestId="kpi-consumed"
      />
      <BudgetKpiCard
        label="Disponible"
        value={formatAmount(kpis.remaining, budget.currency)}
        dataTestId="kpi-remaining"
      />
      <BudgetKpiCard
        label="Forecast"
        value={formatAmount(kpis.forecast, budget.currency)}
        dataTestId="kpi-forecast"
      />
      <BudgetKpiCard
        label="Écart forecast"
        value={ecartStr}
        subtext={ecartSub}
        icon={TrendingDown}
        dataTestId="kpi-forecast-gap"
      />
    </section>
  );
}
