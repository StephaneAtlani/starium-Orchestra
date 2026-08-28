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
import type { BudgetCockpitKpiBlock } from '@/features/budgets/types/budget-dashboard.types';
import {
  formatLandingGapParts,
  formatKpiAmountParts,
  kpiDisplayAmountNumeric,
} from '@/features/budgets/lib/budget-dashboard-format';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { BUDGET_LABELS, BUDGET_LABEL_HINTS } from '@/features/budgets/lib/budget-display-labels';
import { BudgetKpiCard, type BudgetKpiAmountTone } from './budget-kpi-card';
import { CockpitSection } from './budget-cockpit-primitives';

export function BudgetKpiGrid({
  kpis,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  animateAmounts = false,
}: {
  kpis: BudgetCockpitKpiBlock;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  /** Interpolation des montants sur les cartes KPI (cohérent HT/TTC avec le sélecteur). */
  animateAmounts?: boolean;
}) {
  const c = currency;

  const landing = kpis.forecast;
  const ecartLanding = landing - kpis.totalBudget;
  const ecartTtcFromApi =
    kpis.forecastTtc != null && kpis.totalBudgetTtc != null
      ? kpis.forecastTtc - kpis.totalBudgetTtc
      : undefined;
  const gapParts = formatLandingGapParts(
    {
      totalBudget: kpis.totalBudget,
      forecast: landing,
      totalBudgetTtc: kpis.totalBudgetTtc,
      forecastTtc: kpis.forecastTtc,
    },
    c,
    taxDisplayMode,
    defaultTaxRate,
  );
  const ecartSub =
    ecartLanding >= 0
      ? `${BUDGET_LABELS.landing} dépasse le budget sur cette base.`
      : `${BUDGET_LABELS.landing} reste sous le plafond budgétaire.`;

  const remainingTone: BudgetKpiAmountTone =
    kpis.remaining < 0 ? 'danger' : kpis.remaining > 0 ? 'success' : 'default';

  const gapTone: BudgetKpiAmountTone =
    ecartLanding > 0 ? 'warning' : ecartLanding < 0 ? 'success' : 'default';

  const fmt = (p: Parameters<typeof formatKpiAmountParts>[0]) =>
    formatKpiAmountParts(p);

  const num = (ht: number, ttcFromApi?: number | null) =>
    kpiDisplayAmountNumeric({
      ht,
      ttcFromApi: ttcFromApi ?? undefined,
      mode: taxDisplayMode,
      defaultTaxRate,
    });

  return (
    <CockpitSection
      id="budget-kpi-heading"
      title="Synthèse financière"
      description={
        <>
          Montants du budget actif · taux de consommation{' '}
          <span className="font-medium tabular-nums text-foreground">
            {formatPercent(kpis.consumptionRate)}
          </span>
        </>
      }
    >
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4"
        data-testid="budget-dashboard-kpis"
      >
        <BudgetKpiCard
          variant="primary"
          label="Budget"
          description="Plafond de référence"
          parts={fmt({
            ht: kpis.totalBudget,
            ttcFromApi: kpis.totalBudgetTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(kpis.totalBudget, kpis.totalBudgetTtc)}
          animateAmount={animateAmounts}
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
          amountDisplayValue={num(kpis.committed, kpis.committedTtc)}
          animateAmount={animateAmounts}
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
          amountDisplayValue={num(kpis.consumed, kpis.consumedTtc)}
          animateAmount={animateAmounts}
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
          amountDisplayValue={num(kpis.remaining, kpis.remainingTtc)}
          animateAmount={animateAmounts}
          icon={PiggyBank}
          amountTone={remainingTone}
          dataTestId="kpi-remaining"
        />

        <BudgetKpiCard
          variant="forecast"
          label={BUDGET_LABELS.landing}
          description={BUDGET_LABEL_HINTS.landing}
          parts={fmt({
            ht: landing,
            ttcFromApi: kpis.forecastTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(landing, kpis.forecastTtc)}
          animateAmount={animateAmounts}
          icon={Scale}
          dataTestId="kpi-landing"
        />

        <BudgetKpiCard
          variant="variance"
          label={BUDGET_LABELS.landingGap}
          description={`${BUDGET_LABELS.landing} − budget`}
          parts={gapParts}
          subtext={ecartSub}
          amountDisplayValue={num(ecartLanding, ecartTtcFromApi)}
          animateAmount={animateAmounts}
          icon={TrendingDown}
          amountTone={gapTone}
          dataTestId="kpi-landing-gap"
        />
      </div>
    </CockpitSection>
  );
}
