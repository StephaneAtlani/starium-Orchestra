'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { cockpitCardClass } from './budget-dashboard-shell';

export function BudgetAlertsPanel({
  alertsSummary,
  onViewCriticalLines,
}: {
  alertsSummary: BudgetDashboardResponse['alertsSummary'];
  onViewCriticalLines: () => void;
}) {
  const items = [
    {
      key: 'negative',
      icon: ArrowDownRight,
      label: 'Lignes en reste négatif',
      count: alertsSummary.negativeRemaining,
    },
    {
      key: 'committed',
      icon: Wallet,
      label: 'Lignes sur-engagées',
      count: alertsSummary.overCommitted,
    },
    {
      key: 'consumed',
      icon: TrendingUp,
      label: 'Lignes surconsommées',
      count: alertsSummary.overConsumed,
    },
    {
      key: 'forecast',
      icon: AlertTriangle,
      label: 'Forecast > budget (ligne)',
      count: alertsSummary.forecastOverBudget,
    },
  ];

  const hasAny = items.some((i) => i.count > 0);

  return (
    <Card
      className={`${cockpitCardClass} border-amber-200/80 bg-amber-50/40`}
      data-testid="budget-dashboard-alerts"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">
          Alertes &amp; décisions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            Aucune alerte ligne sur les critères suivants (périmètre budget
            actif).
          </p>
        ) : null}
        {items.map(({ key, icon: Icon, label, count }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon
                className="h-4 w-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span className="truncate text-sm text-foreground">{label}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-sm font-semibold text-foreground">
                {count}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-primary"
                onClick={onViewCriticalLines}
              >
                Voir
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
