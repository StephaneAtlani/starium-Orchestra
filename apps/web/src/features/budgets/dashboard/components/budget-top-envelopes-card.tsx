'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import {
  formatDashboardAmount,
  resolveTtcDisplay,
} from '@/features/budgets/lib/budget-dashboard-format';
import { BudgetLinesProgress } from '@/features/budgets/components/budget-lines-progress';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import {
  cockpitTableHeadRow,
  cockpitTdFirst,
  cockpitTdNum,
  cockpitTdProgress,
  cockpitThFirst,
  cockpitThNum,
  cockpitThProgress,
} from './budget-cockpit-table-classes';

export function BudgetTopEnvelopesCard({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  onRowClick,
}: {
  rows: NonNullable<BudgetDashboardResponse['topEnvelopes']>;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onRowClick?: () => void;
}) {
  if (rows.length === 0) return null;

  return (
    <CockpitSection
      id="budget-top-envelopes-heading"
      title="Enveloppes les plus consommées"
      description="Classement par montant consommé (10 lignes max.). Cliquez une ligne pour aller aux alertes."
    >
      <CockpitSurfaceCard
        title="Top enveloppes"
        description="Budget, consommé et restant — même mode HT/TTC que la synthèse."
        icon={Trophy}
        accent="sky"
        contentPad={false}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader className="bg-transparent">
            <TableRow className={cockpitTableHeadRow}>
              <TableHead className={cockpitThFirst}>Enveloppe</TableHead>
              <TableHead className={cockpitThNum}>Budget</TableHead>
              <TableHead className={cockpitThNum}>Consommé</TableHead>
              <TableHead className={cockpitThNum}>Restant</TableHead>
              <TableHead className={cockpitThProgress}>Progression</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => {
              const revisedForProgress =
                taxDisplayMode === 'TTC'
                  ? (resolveTtcDisplay(e.totalBudget, null, defaultTaxRate) ??
                    e.totalBudget)
                  : e.totalBudget;
              const consumedForProgress =
                taxDisplayMode === 'TTC'
                  ? (resolveTtcDisplay(e.consumed, null, defaultTaxRate) ??
                    e.consumed)
                  : e.consumed;
              const remainingForProgress =
                taxDisplayMode === 'TTC'
                  ? (resolveTtcDisplay(e.remaining, null, defaultTaxRate) ??
                    e.remaining)
                  : e.remaining;

              return (
                <TableRow
                  key={e.envelopeId}
                  className="cursor-pointer border-border transition-colors hover:bg-muted/50"
                  onClick={onRowClick}
                >
                  <TableCell className={cockpitTdFirst}>
                    {e.code ? `${e.code} — ` : ''}
                    {e.name}
                  </TableCell>
                  <TableCell className={cockpitTdNum}>
                    {formatDashboardAmount({
                      ht: e.totalBudget,
                      currency,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </TableCell>
                  <TableCell className={cockpitTdNum}>
                    {formatDashboardAmount({
                      ht: e.consumed,
                      currency,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </TableCell>
                  <TableCell className={cockpitTdNum}>
                    {formatDashboardAmount({
                      ht: e.remaining,
                      currency,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </TableCell>
                  <TableCell className={cockpitTdProgress}>
                    <BudgetLinesProgress
                      revisedAmount={revisedForProgress}
                      consumedAmount={consumedForProgress}
                      remainingAmount={remainingForProgress}
                      currency={currency}
                      className="w-full max-w-[9rem]"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CockpitSurfaceCard>
    </CockpitSection>
  );
}
