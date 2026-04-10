'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  PiggyBank,
  Scale,
  TrendingDown,
  Wallet,
  Waypoints,
} from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';
import {
  formatForecastGapParts,
  formatKpiAmountParts,
} from '@/features/budgets/lib/budget-dashboard-format';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { BudgetKpiCard, type BudgetKpiAmountTone } from '@/features/budgets/dashboard/components/budget-kpi-card';
import { CockpitSection } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function safeRate(n: number, d: number): number {
  if (d === 0 || !Number.isFinite(d)) return 0;
  return n / d;
}

export function BudgetDetailDashboard({
  kpi,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  kpi: BudgetSummaryKpi;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  const rev = kpi.totalInitialAmount;
  const consumptionRate =
    kpi.consumptionRate ?? safeRate(kpi.totalConsumedAmount, rev);
  const commitmentRate =
    kpi.commitmentRate ?? safeRate(kpi.totalCommittedAmount, rev);
  const forecastRate =
    kpi.forecastRate ?? safeRate(kpi.totalForecastAmount, rev);

  const gapKpis = {
    totalBudget: kpi.totalInitialAmount,
    forecast: kpi.totalForecastAmount,
    totalBudgetTtc: kpi.totalInitialAmountTtc,
    forecastTtc: kpi.totalForecastAmountTtc,
  };
  const ecartForecast = kpi.totalForecastAmount - kpi.totalInitialAmount;
  const gapParts = formatForecastGapParts(
    gapKpis,
    currency,
    taxDisplayMode,
    defaultTaxRate,
  );
  const ecartSub =
    ecartForecast >= 0
      ? 'Le prévisionnel agrégé dépasse le budget sur cette base.'
      : 'Le prévisionnel reste sous le plafond budgétaire.';

  const remainingTone: BudgetKpiAmountTone =
    kpi.totalRemainingAmount < 0
      ? 'danger'
      : kpi.totalRemainingAmount > 0
        ? 'success'
        : 'default';

  const gapTone: BudgetKpiAmountTone =
    ecartForecast > 0 ? 'warning' : ecartForecast < 0 ? 'success' : 'default';

  const fmt = (p: Parameters<typeof formatKpiAmountParts>[0]) =>
    formatKpiAmountParts(p);

  const lines = kpi.lineCount ?? 0;
  const overC = kpi.overConsumedLineCount ?? 0;
  const overCo = kpi.overCommittedLineCount ?? 0;
  const negRem = kpi.negativeRemainingLineCount ?? 0;
  const hasAlerts = overC > 0 || overCo > 0 || negRem > 0;

  return (
    <div className="space-y-6" data-testid="budget-detail-dashboard">
      {hasAlerts ? (
        <Alert variant="default" className="border-amber-500/40 bg-amber-500/[0.06]">
          <AlertTriangle className="size-4 text-amber-600" />
          <AlertTitle>Lignes à surveiller</AlertTitle>
          <AlertDescription className="text-sm">
            {overC > 0 ? (
              <span className="mr-2 inline-block">
                {overC} ligne{overC > 1 ? 's' : ''} en sur-consommation
              </span>
            ) : null}
            {overCo > 0 ? (
              <span className="mr-2 inline-block">
                {overCo} ligne{overCo > 1 ? 's' : ''} en sur-engagement
              </span>
            ) : null}
            {negRem > 0 ? (
              <span className="inline-block">
                {negRem} ligne{negRem > 1 ? 's' : ''} avec restant négatif
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <CockpitSection
        id="budget-detail-kpi-heading"
        title="Pilotage budgétaire"
        description={
          <>
            Vue agrégée du budget · {lines} ligne{lines > 1 ? 's' : ''} · taux de consommation{' '}
            <span className="font-medium tabular-nums text-foreground">
              {formatPercent(consumptionRate)}
            </span>
            {' · '}
            engagement{' '}
            <span className="font-medium tabular-nums text-foreground">
              {formatPercent(commitmentRate)}
            </span>
            {' · '}
            prévisionnel / budget{' '}
            <span className="font-medium tabular-nums text-foreground">
              {formatPercent(forecastRate)}
            </span>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
          <BudgetKpiCard
            variant="primary"
            label="Budget"
            description="Plafond de référence"
            parts={fmt({
              ht: kpi.totalInitialAmount,
              ttcFromApi: kpi.totalInitialAmountTtc,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
            icon={Wallet}
            dataTestId="detail-kpi-budget"
          />

          <BudgetKpiCard
            variant="forecast"
            label="Total planifié"
            description="Somme des planifications mensuelles (RFC-023)"
            parts={fmt({
              ht: kpi.totalForecastAmount,
              ttcFromApi: kpi.totalForecastAmountTtc,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
            icon={Scale}
            dataTestId="detail-kpi-forecast"
          />

          <BudgetKpiCard
            variant="committed"
            label="Engagé"
            description="Commandes & engagements"
            parts={fmt({
              ht: kpi.totalCommittedAmount,
              ttcFromApi: kpi.totalCommittedAmountTtc,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
            icon={Waypoints}
            dataTestId="detail-kpi-committed"
          />

          <BudgetKpiCard
            variant="consumed"
            label="Consommé"
            description="Réalisé (facturé / imputé)"
            parts={fmt({
              ht: kpi.totalConsumedAmount,
              ttcFromApi: kpi.totalConsumedAmountTtc,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
            icon={ArrowDownRight}
            dataTestId="detail-kpi-consumed"
          />

          <BudgetKpiCard
            variant="liquidity"
            label="Disponible"
            description="Reste à engager / consommer"
            parts={fmt({
              ht: kpi.totalRemainingAmount,
              ttcFromApi: kpi.totalRemainingAmountTtc,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
            icon={PiggyBank}
            amountTone={remainingTone}
            dataTestId="detail-kpi-remaining"
          />

          <BudgetKpiCard
            variant="variance"
            label="Écart planifié / budget"
            description="Total planifié − budget"
            parts={gapParts}
            subtext={ecartSub}
            icon={TrendingDown}
            amountTone={gapTone}
            dataTestId="detail-kpi-previ-gap"
          />
        </div>
      </CockpitSection>
    </div>
  );
}
