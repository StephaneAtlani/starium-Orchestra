'use client';

import React from 'react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetCockpitResponse } from '@/features/budgets/types/budget-dashboard.types';
import { BudgetAlertsPanel } from './budget-alerts-panel';
import { BudgetCapexOpexCard } from './budget-capex-opex-card';
import { BudgetEnvelopesTable } from './budget-envelopes-table';
import { BudgetKpiGrid } from './budget-kpi-grid';
import { BudgetLinesCritiqueTable } from './budget-lines-critique-table';
import { BudgetMonthlyTrendCard } from './budget-monthly-trend-card';
import { BudgetRunBuildCard } from './budget-run-build-card';
import { BudgetTopBudgetLinesCard } from './budget-top-budget-lines-card';
import { BudgetTopEnvelopesCard } from './budget-top-envelopes-card';

type Props = {
  data: BudgetCockpitResponse;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  /** Animation des grands chiffres sur la synthèse financière (préférence cockpit). */
  animateAmounts: boolean;
  onViewCriticalLines: () => void;
  criticalRef: React.RefObject<HTMLDivElement | null>;
  onEnvelopeClick: (envelopeId: string) => void;
  onBudgetLineClick: (lineId: string) => void;
};

export function BudgetCockpitWidgetRenderer({
  data,
  taxDisplayMode,
  defaultTaxRate,
  animateAmounts,
  onViewCriticalLines,
  criticalRef,
  onEnvelopeClick,
  onBudgetLineClick,
}: Props) {
  const { widgets, budget } = data;
  const sorted = [...widgets].sort((a, b) => a.position - b.position);

  return (
    <>
      {sorted.map((w) => {
        if (!w.isActive) {
          return null;
        }
        switch (w.type) {
          case 'KPI': {
            if (!w.data) return <React.Fragment key={w.id} />;
            return (
              <React.Fragment key={w.id}>
                <BudgetKpiGrid
                  kpis={w.data.kpis}
                  currency={budget.currency}
                  taxDisplayMode={taxDisplayMode}
                  defaultTaxRate={defaultTaxRate}
                  animateAmounts={animateAmounts}
                />
                {w.data.capexOpexDistribution ? (
                  <div className="mt-4 w-full min-w-0">
                    <BudgetCapexOpexCard
                      capexOpexDistribution={w.data.capexOpexDistribution}
                      currency={budget.currency}
                      taxDisplayMode={taxDisplayMode}
                      defaultTaxRate={defaultTaxRate}
                    />
                  </div>
                ) : null}
              </React.Fragment>
            );
          }
          case 'ALERT_LIST': {
            const totals = w.data?.totals ?? {
              negativeRemaining: 0,
              overCommitted: 0,
              overConsumed: 0,
              forecastOverBudget: 0,
            };
            return (
              <div key={w.id} className="mt-6">
                <BudgetAlertsPanel
                  alertsSummary={totals}
                  onViewCriticalLines={onViewCriticalLines}
                />
              </div>
            );
          }
          case 'ENVELOPE_LIST': {
            const top = w.data?.topEnvelopes ?? [];
            const risk = w.data?.riskEnvelopes ?? [];
            return (
              <div key={w.id} className="mt-6 space-y-6">
                {top.length > 0 ? (
                  <BudgetTopEnvelopesCard
                    rows={top}
                    currency={budget.currency}
                    taxDisplayMode={taxDisplayMode}
                    defaultTaxRate={defaultTaxRate}
                    onEnvelopeClick={onEnvelopeClick}
                  />
                ) : null}
                {risk.length > 0 ? (
                  <BudgetEnvelopesTable
                    rows={risk}
                    currency={budget.currency}
                    taxDisplayMode={taxDisplayMode}
                    defaultTaxRate={defaultTaxRate}
                    onEnvelopeClick={onEnvelopeClick}
                  />
                ) : null}
              </div>
            );
          }
          case 'LINE_LIST': {
            const topLines = w.data?.topBudgetLines ?? [];
            const crit = w.data?.criticalBudgetLines ?? [];
            return (
              <div key={w.id} className="mt-6 space-y-6">
                <div ref={criticalRef}>
                  {crit.length > 0 ? (
                    <BudgetLinesCritiqueTable
                      rows={crit}
                      currency={budget.currency}
                      budgetId={budget.id}
                      taxDisplayMode={taxDisplayMode}
                      defaultTaxRate={defaultTaxRate}
                      onBudgetLineClick={onBudgetLineClick}
                    />
                  ) : null}
                </div>
                {topLines.length > 0 ? (
                  <BudgetTopBudgetLinesCard
                    rows={topLines}
                    currency={budget.currency}
                    taxDisplayMode={taxDisplayMode}
                    defaultTaxRate={defaultTaxRate}
                    onBudgetLineClick={onBudgetLineClick}
                  />
                ) : null}
              </div>
            );
          }
          case 'CHART': {
            if (!w.data) return <React.Fragment key={w.id} />;
            if (w.data.chartType === 'RUN_BUILD_BREAKDOWN') {
              return (
                <div key={w.id} className="mt-6">
                  <BudgetRunBuildCard
                    distribution={w.data.series}
                    currency={budget.currency}
                    taxDisplayMode={taxDisplayMode}
                    defaultTaxRate={defaultTaxRate}
                  />
                </div>
              );
            }
            return (
              <div key={w.id} className="mt-6">
                <BudgetMonthlyTrendCard
                  monthlyTrend={w.data.series}
                  currency={budget.currency}
                  taxDisplayMode={taxDisplayMode}
                  defaultTaxRate={defaultTaxRate}
                />
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}
