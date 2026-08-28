'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  formatCurrency,
  formatPercent,
} from '@/features/budgets/lib/budget-formatters';
import { BUDGET_LABELS } from '@/features/budgets/lib/budget-display-labels';
import type {
  BudgetForecastResponse,
  EnvelopeForecastResponse,
} from '@/features/budgets/types/budget-forecast.types';
import { ForecastKpiSkeleton } from './forecast-kpi-skeleton';

function varianceTone(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-red-600 dark:text-red-400';
  return 'text-foreground';
}

type ForecastKpiSource = BudgetForecastResponse | EnvelopeForecastResponse;

export interface ForecastKpiCardsProps {
  data: ForecastKpiSource | null | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Succès mais aucune donnée exploitable */
  isEmpty?: boolean;
}

export function ForecastKpiCards({
  data,
  isLoading,
  error,
  isEmpty,
}: ForecastKpiCardsProps) {
  if (isLoading) {
    return <ForecastKpiSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="forecast-kpi-error">
        <AlertTitle>{BUDGET_LABELS.landing} indisponible</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (isEmpty || !data) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="forecast-kpi-empty"
      >
        Aucune donnée disponible
      </p>
    );
  }

  const cur = data.currency;
  const landing = data.totalLanding ?? data.totalForecast;
  const landingVariance = data.varianceLanding ?? data.varianceForecast;
  const landingRate = data.landingRate ?? data.forecastRate;
  const overLanding = data.alerts.overLanding ?? data.alerts.overForecast;

  const items: { label: string; value: string; sub?: string; valueClass?: string }[] = [
    {
      label: 'Budget total',
      value: formatCurrency(data.totalBudget, cur),
    },
    {
      label: BUDGET_LABELS.consumed,
      value: formatCurrency(data.totalConsumed, cur),
    },
    {
      label: BUDGET_LABELS.landing,
      value: formatCurrency(landing, cur),
    },
    {
      label: BUDGET_LABELS.remaining,
      value: formatCurrency(data.totalRemaining, cur),
    },
    {
      label: BUDGET_LABELS.landingGap,
      value: formatCurrency(landingVariance, cur),
      valueClass: varianceTone(landingVariance),
      sub: `Taux consommation ${formatPercent(data.consumptionRate)} · Taux ${BUDGET_LABELS.landing.toLowerCase()} ${formatPercent(landingRate)}`,
    },
  ];

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      data-testid="forecast-kpi-cards"
    >
      {items.map((item) => (
        <div key={item.label} className="starium-kpi-card">
          <span className="starium-kpi-label block">{item.label}</span>
          <div
            className={cn(
              'starium-kpi-value starium-kpi-value--dense',
              item.valueClass,
            )}
            data-testid={`forecast-kpi-${item.label.replace(/\s/g, '-').toLowerCase()}`}
          >
            {item.value}
          </div>
          {item.sub ? (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.sub}</p>
          ) : null}
        </div>
      ))}
      {(overLanding > 0 || data.alerts.overConsumed > 0) && (
        <Card className="border-dashed sm:col-span-2 lg:col-span-3 xl:col-span-5">
          <CardHeader className="pb-1">
            <span className="text-sm font-medium">Alertes</span>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lignes au-dessus de l&apos;{BUDGET_LABELS.landing.toLowerCase()} : {overLanding} · au-dessus du
            consommé vs budget : {data.alerts.overConsumed}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
