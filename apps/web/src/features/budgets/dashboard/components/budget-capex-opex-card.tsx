'use client';

import React from 'react';
import { PieChart } from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { CockpitSurfaceCard } from './budget-cockpit-primitives';

export function BudgetCapexOpexCard({
  capexOpexDistribution,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  capexOpexDistribution: { capex: number; opex: number };
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  return (
    <CockpitSurfaceCard
      title="CAPEX / OPEX"
      description="Montants budgétés (révisés) par type de dépense"
      icon={PieChart}
      accent="violet"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">CAPEX</span>
          <span className="text-right text-sm font-semibold tabular-nums text-foreground">
            {formatDashboardAmount({
              ht: capexOpexDistribution.capex,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">OPEX</span>
          <span className="text-right text-sm font-semibold tabular-nums text-foreground">
            {formatDashboardAmount({
              ht: capexOpexDistribution.opex,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}
          </span>
        </div>
      </div>
    </CockpitSurfaceCard>
  );
}
