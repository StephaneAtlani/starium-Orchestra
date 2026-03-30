'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  formatCurrency,
  formatPercent,
} from '@/features/budgets/lib/budget-formatters';
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
        <AlertTitle>Forecast indisponible</AlertTitle>
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
  const items: { label: string; value: string; sub?: string; valueClass?: string }[] = [
    {
      label: 'Budget total',
      value: formatCurrency(data.totalBudget, cur),
    },
    {
      label: 'Consommé',
      value: formatCurrency(data.totalConsumed, cur),
    },
    {
      label: 'Forecast',
      value: formatCurrency(data.totalForecast, cur),
    },
    {
      label: 'Restant',
      value: formatCurrency(data.totalRemaining, cur),
    },
    {
      label: 'Variance forecast',
      value: formatCurrency(data.varianceForecast, cur),
      valueClass: varianceTone(data.varianceForecast),
      sub: `Taux consommation ${formatPercent(data.consumptionRate)} · Taux forecast ${formatPercent(data.forecastRate)}`,
    },
  ];

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      data-testid="forecast-kpi-cards"
    >
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-1">
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div
              className={`text-xl font-semibold ${item.valueClass ?? ''}`}
              data-testid={`forecast-kpi-${item.label.replace(/\s/g, '-').toLowerCase()}`}
            >
              {item.value}
            </div>
            {item.sub ? (
              <p className="text-xs leading-snug text-muted-foreground">{item.sub}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {(data.alerts.overForecast > 0 || data.alerts.overConsumed > 0) && (
        <Card className="border-dashed sm:col-span-2 lg:col-span-3 xl:col-span-5">
          <CardHeader className="pb-1">
            <span className="text-sm font-medium">Alertes</span>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lignes au-dessus du forecast : {data.alerts.overForecast} · au-dessus du
            consommé vs budget : {data.alerts.overConsumed}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
