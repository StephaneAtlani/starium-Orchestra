'use client';

import React from 'react';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import { BudgetKpiCards } from './budget-kpi-cards';
import { formatAmount } from '../lib/budget-formatters';

interface BudgetEnvelopeSummaryCardsProps {
  envelope: BudgetEnvelopeDetail;
}

export function BudgetEnvelopeSummaryCards({
  envelope,
}: BudgetEnvelopeSummaryCardsProps) {
  const currency = envelope.currency;
  const items = [
    { label: 'Initial', value: formatAmount(envelope.initialAmount, currency) },
    { label: 'Révisé', value: formatAmount(envelope.revisedAmount, currency) },
    { label: 'Forecast', value: formatAmount(envelope.forecastAmount, currency) },
    { label: 'Engagé', value: formatAmount(envelope.committedAmount, currency) },
    { label: 'Consommé', value: formatAmount(envelope.consumedAmount, currency) },
    {
      label: 'Restant',
      value: formatAmount(envelope.remainingAmount, currency),
    },
  ];

  return <BudgetKpiCards items={items} className="mb-6" />;
}

