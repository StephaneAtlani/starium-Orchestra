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
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import type { BudgetSummaryKpi } from '../types/budget-reporting.types';
import {
  BUDGET_LABELS,
  BUDGET_LABEL_HINTS,
} from '../lib/budget-display-labels';
import {
  formatLandingGapParts,
  formatKpiAmountParts,
  kpiDisplayAmountNumeric,
} from '../lib/budget-dashboard-format';
import { budgetKpiAmountForTaxMode } from '../lib/budget-formatters';
import {
  BudgetKpiCard,
  type BudgetKpiAmountTone,
} from '../dashboard/components/budget-kpi-card';
import { CockpitSection } from '../dashboard/components/budget-cockpit-primitives';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BudgetEnvelopeSummaryCardsProps {
  envelope: BudgetEnvelopeDetail;
  /** KPI reporting aligné (GET /api/budget-reporting/envelopes/:id/summary). */
  kpi?: BudgetSummaryKpi;
  isLoading?: boolean;
  isError?: boolean;
}

export function BudgetEnvelopeSummaryCards({
  envelope,
  kpi,
  isLoading = false,
  isError = false,
}: BudgetEnvelopeSummaryCardsProps) {
  const {
    taxDisplayMode,
    isLoading: taxLoading,
    defaultTaxRate,
  } = useTaxDisplayMode();
  const c = kpi?.currency ?? envelope.currency;

  const fmt = (p: Parameters<typeof formatKpiAmountParts>[0]) =>
    formatKpiAmountParts(p);

  const num = (ht: number, ttcFromApi?: number | null) =>
    kpiDisplayAmountNumeric({
      ht,
      ttcFromApi: ttcFromApi ?? undefined,
      mode: taxDisplayMode,
      defaultTaxRate,
    });

  if (isLoading && !kpi) {
    return (
      <CockpitSection
        id="envelope-kpi-heading"
        title="Synthèse financière"
        description="Chargement des indicateurs…"
      >
        <LoadingState rows={2} />
      </CockpitSection>
    );
  }

  if (isError && !kpi) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Indicateurs indisponibles</AlertTitle>
        <AlertDescription>
          Impossible de charger la synthèse financière de cette enveloppe.
        </AlertDescription>
      </Alert>
    );
  }

  const budgetBase = kpi
    ? budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'initial')
    : envelope.initialAmount;
  const landing = kpi
    ? budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'landing')
    : envelope.landingAmount ?? envelope.forecastAmount;
  const committed = kpi
    ? budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'committed')
    : envelope.committedAmount;
  const consumed = kpi
    ? budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'consumed')
    : envelope.consumedAmount;
  const remaining = kpi
    ? budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'remaining')
    : envelope.remainingAmount;
  const landingGap =
    kpi?.landingGapAmount ??
    kpi?.forecastGapAmount ??
    landing - budgetBase;

  const gapParts = formatLandingGapParts(
    {
      totalBudget: budgetBase,
      forecast: landing,
    },
    c,
    taxDisplayMode,
    defaultTaxRate,
  );
  const ecartSub =
    landingGap >= 0
      ? `${BUDGET_LABELS.landing} dépasse le budget de l'enveloppe sur cette base.`
      : `${BUDGET_LABELS.landing} reste sous le plafond budgétaire.`;

  const remainingTone: BudgetKpiAmountTone =
    remaining < 0 ? 'danger' : remaining > 0 ? 'success' : 'default';

  const gapTone: BudgetKpiAmountTone =
    landingGap > 0 ? 'warning' : landingGap < 0 ? 'success' : 'default';

  return (
    <CockpitSection
      id="envelope-kpi-heading"
      title="Synthèse financière"
      description={
        taxLoading
          ? 'Chargement du mode d’affichage HT/TTC…'
          : 'Montants de l’enveloppe — même lecture que le cockpit budget.'
      }
    >
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        data-testid="budget-envelope-kpis"
      >
        <BudgetKpiCard
          variant="primary"
          label={BUDGET_LABELS.budget}
          description="Plafond de référence"
          parts={fmt({
            ht: kpi?.totalInitialAmount ?? envelope.initialAmount,
            ttcFromApi: kpi?.totalInitialAmountTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(
            kpi?.totalInitialAmount ?? envelope.initialAmount,
            kpi?.totalInitialAmountTtc,
          )}
          icon={Wallet}
          dataTestId="envelope-kpi-budget"
        />

        <BudgetKpiCard
          variant="forecast"
          label={BUDGET_LABELS.landing}
          description={BUDGET_LABEL_HINTS.landing}
          parts={fmt({
            ht: kpi?.totalLandingAmount ?? kpi?.totalForecastAmount ?? landing,
            ttcFromApi:
              kpi?.totalLandingAmountTtc ?? kpi?.totalForecastAmountTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(
            kpi?.totalLandingAmount ?? kpi?.totalForecastAmount ?? landing,
            kpi?.totalLandingAmountTtc ?? kpi?.totalForecastAmountTtc,
          )}
          icon={Scale}
          dataTestId="envelope-kpi-landing"
        />

        <BudgetKpiCard
          variant="committed"
          label={BUDGET_LABELS.committed}
          description="Commandes & engagements"
          parts={fmt({
            ht: kpi?.totalCommittedAmount ?? envelope.committedAmount,
            ttcFromApi: kpi?.totalCommittedAmountTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(
            kpi?.totalCommittedAmount ?? envelope.committedAmount,
            kpi?.totalCommittedAmountTtc,
          )}
          icon={Waypoints}
          dataTestId="envelope-kpi-committed"
        />

        <BudgetKpiCard
          variant="consumed"
          label={BUDGET_LABELS.consumed}
          description="Réalisé (facturé / imputé)"
          parts={fmt({
            ht: kpi?.totalConsumedAmount ?? envelope.consumedAmount,
            ttcFromApi: kpi?.totalConsumedAmountTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(
            kpi?.totalConsumedAmount ?? envelope.consumedAmount,
            kpi?.totalConsumedAmountTtc,
          )}
          icon={ArrowDownRight}
          dataTestId="envelope-kpi-consumed"
        />

        <BudgetKpiCard
          variant="liquidity"
          label={BUDGET_LABELS.remaining}
          description="Reste à engager / consommer"
          parts={fmt({
            ht: kpi?.totalRemainingAmount ?? envelope.remainingAmount,
            ttcFromApi: kpi?.totalRemainingAmountTtc,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          amountDisplayValue={num(
            kpi?.totalRemainingAmount ?? envelope.remainingAmount,
            kpi?.totalRemainingAmountTtc,
          )}
          icon={PiggyBank}
          amountTone={remainingTone}
          dataTestId="envelope-kpi-remaining"
        />

        <BudgetKpiCard
          variant="variance"
          label={BUDGET_LABELS.landingGap}
          description={`${BUDGET_LABELS.landing} − budget`}
          parts={gapParts}
          subtext={ecartSub}
          amountDisplayValue={num(landingGap, null)}
          icon={TrendingDown}
          amountTone={gapTone}
          dataTestId="envelope-kpi-landing-gap"
        />
      </div>
    </CockpitSection>
  );
}
