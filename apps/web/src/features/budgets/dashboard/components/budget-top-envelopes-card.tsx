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
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import {
  cockpitTableHeadRow,
  cockpitTdFirst,
  cockpitTdNum,
  cockpitTdNumLast,
  cockpitThFirst,
  cockpitThNum,
  cockpitThNumLast,
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
              <TableHead className={cockpitThNumLast}>Restant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
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
                <TableCell className={cockpitTdNumLast}>
                  {formatDashboardAmount({
                    ht: e.remaining,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CockpitSurfaceCard>
    </CockpitSection>
  );
}
