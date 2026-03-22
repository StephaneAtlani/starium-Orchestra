'use client';

import React from 'react';
import {
  ArrowDownRight,
  Banknote,
  PiggyBank,
  Scale,
  TrendingDown,
  Wallet,
  Waypoints,
} from 'lucide-react';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import {
  formatForecastGapParts,
  formatKpiAmountParts,
} from '../lib/budget-dashboard-format';
import { BudgetKpiCard, type BudgetKpiAmountTone } from '../dashboard/components/budget-kpi-card';
import { CockpitSection } from '../dashboard/components/budget-cockpit-primitives';

interface BudgetEnvelopeSummaryCardsProps {
  envelope: BudgetEnvelopeDetail;
}

export function BudgetEnvelopeSummaryCards({
  envelope,
}: BudgetEnvelopeSummaryCardsProps) {
  const {
    taxDisplayMode,
    isLoading: taxLoading,
    defaultTaxRate,
  } = useTaxDisplayMode();
  const c = envelope.currency;

  const fmt = (p: Parameters<typeof formatKpiAmountParts>[0]) =>
    formatKpiAmountParts(p);

  const ecartForecast = envelope.forecastAmount - envelope.revisedAmount;
  const gapParts = formatForecastGapParts(
    {
      totalBudget: envelope.revisedAmount,
      forecast: envelope.forecastAmount,
    },
    c,
    taxDisplayMode,
    defaultTaxRate,
  );
  const ecartSub =
    ecartForecast >= 0
      ? 'Le forecast dépasse le budget révisé de l’enveloppe sur cette base.'
      : 'Le forecast reste sous le plafond budgétaire révisé.';

  const remainingTone: BudgetKpiAmountTone =
    envelope.remainingAmount < 0
      ? 'danger'
      : envelope.remainingAmount > 0
        ? 'success'
        : 'default';

  const gapTone: BudgetKpiAmountTone =
    ecartForecast > 0 ? 'warning' : ecartForecast < 0 ? 'success' : 'default';

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
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4"
        data-testid="budget-envelope-kpis"
      >
        <BudgetKpiCard
          variant="forecast"
          label="Montant initial"
          description="Référence de départ"
          parts={fmt({
            ht: envelope.initialAmount,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Banknote}
          dataTestId="envelope-kpi-initial"
        />

        <BudgetKpiCard
          variant="primary"
          label="Budget révisé"
          description="Plafond de référence"
          parts={fmt({
            ht: envelope.revisedAmount,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Wallet}
          dataTestId="envelope-kpi-revised"
        />

        <BudgetKpiCard
          variant="committed"
          label="Engagé"
          description="Commandes & engagements"
          parts={fmt({
            ht: envelope.committedAmount,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Waypoints}
          dataTestId="envelope-kpi-committed"
        />

        <BudgetKpiCard
          variant="consumed"
          label="Consommé"
          description="Réalisé (facturé / imputé)"
          parts={fmt({
            ht: envelope.consumedAmount,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={ArrowDownRight}
          dataTestId="envelope-kpi-consumed"
        />

        <BudgetKpiCard
          variant="liquidity"
          label="Disponible"
          description="Reste à engager / consommer"
          parts={fmt({
            ht: envelope.remainingAmount,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={PiggyBank}
          amountTone={remainingTone}
          dataTestId="envelope-kpi-remaining"
        />

        <BudgetKpiCard
          variant="forecast"
          label="Forecast"
          description="Projection à date"
          parts={fmt({
            ht: envelope.forecastAmount,
            currency: c,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
          icon={Scale}
          dataTestId="envelope-kpi-forecast"
        />

        <BudgetKpiCard
          variant="variance"
          label="Écart forecast"
          description="Forecast − budget révisé"
          parts={gapParts}
          subtext={ecartSub}
          icon={TrendingDown}
          amountTone={gapTone}
          dataTestId="envelope-kpi-forecast-gap"
        />
      </div>
    </CockpitSection>
  );
}
