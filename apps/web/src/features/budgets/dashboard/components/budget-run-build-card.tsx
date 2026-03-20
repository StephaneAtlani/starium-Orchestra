'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { formatAmount } from '@/features/budgets/lib/budget-formatters';
import { cockpitCardClass } from './budget-dashboard-shell';

function Bar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{formatAmount(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BudgetRunBuildCard({
  distribution,
  currency,
}: {
  distribution: BudgetDashboardResponse['runBuildDistribution'];
  currency: string;
}) {
  const total = distribution.run + distribution.build + distribution.transverse;

  return (
    <Card
      className={cockpitCardClass}
      data-testid="budget-dashboard-run-build"
    >
      <CardHeader>
        <CardTitle className="text-base">RUN / BUILD / TRANSVERSE</CardTitle>
        <CardDescription>
          Répartition du budget révisé par type d&apos;enveloppe (hors CAPEX/OPEX)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Bar
          label="RUN"
          value={distribution.run}
          total={total}
          colorClass="bg-emerald-500/90"
        />
        <Bar
          label="BUILD"
          value={distribution.build}
          total={total}
          colorClass="bg-sky-500/90"
        />
        <Bar
          label="TRANSVERSE"
          value={distribution.transverse}
          total={total}
          colorClass="bg-violet-500/90"
        />
        <p className="text-xs text-muted-foreground">
          Total : {formatAmount(total, currency)}
        </p>
      </CardContent>
    </Card>
  );
}
