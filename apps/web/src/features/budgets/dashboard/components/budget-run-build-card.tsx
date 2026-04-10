'use client';

import React from 'react';
import { Boxes } from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { CockpitSurfaceCard } from './budget-cockpit-primitives';

function Bar({
  label,
  value,
  total,
  colorClass,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-right tabular-nums text-sm font-medium text-foreground">
          {formatDashboardAmount({
            ht: value,
            currency,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground tabular-nums">{pct}% du total</p>
    </div>
  );
}

export function BudgetRunBuildCard({
  distribution,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  distribution: { run: number; build: number; transverse: number };
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  const total = distribution.run + distribution.build + distribution.transverse;

  return (
    <CockpitSurfaceCard
      title="RUN / BUILD / TRANSVERSE"
      description="Répartition du budget par type d’enveloppe (hors CAPEX/OPEX)"
      icon={Boxes}
      accent="emerald"
      data-testid="budget-dashboard-run-build"
      footer={
        <>
          Total :{' '}
          {formatDashboardAmount({
            ht: total,
            currency,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
        </>
      }
    >
      <div className="space-y-5">
        <Bar
          label="RUN"
          value={distribution.run}
          total={total}
          colorClass="bg-emerald-500/90"
          currency={currency}
          taxDisplayMode={taxDisplayMode}
          defaultTaxRate={defaultTaxRate}
        />
        <Bar
          label="BUILD"
          value={distribution.build}
          total={total}
          colorClass="bg-sky-500/90"
          currency={currency}
          taxDisplayMode={taxDisplayMode}
          defaultTaxRate={defaultTaxRate}
        />
        <Bar
          label="TRANSVERSE"
          value={distribution.transverse}
          total={total}
          colorClass="bg-violet-500/90"
          currency={currency}
          taxDisplayMode={taxDisplayMode}
          defaultTaxRate={defaultTaxRate}
        />
      </div>
    </CockpitSurfaceCard>
  );
}
