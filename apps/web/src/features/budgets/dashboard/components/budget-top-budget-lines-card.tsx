'use client';

import React from 'react';
import { ListOrdered } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import { LineSeverityLabel } from './budget-cockpit-status-labels';
import {
  cockpitTableHeadRow,
  cockpitTdEnd,
  cockpitTdFirst,
  cockpitTdNum,
  cockpitTdNumLast,
  cockpitTdText,
  cockpitThEndLeft,
  cockpitThFirst,
  cockpitThNum,
  cockpitThNumLast,
  cockpitThText,
} from './budget-cockpit-table-classes';

export function BudgetTopBudgetLinesCard({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  rows: NonNullable<BudgetDashboardResponse['topBudgetLines']>;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  if (rows.length === 0) return null;

  return (
    <CockpitSection
      id="budget-top-lines-heading"
      title="Lignes les plus consommées"
      description="Classement par montant consommé (10 lignes max.)."
    >
      <CockpitSurfaceCard
        title="Top lignes"
        description="Consommation, forecast, restant et niveau de risque ligne."
        icon={ListOrdered}
        accent="primary"
        contentPad={false}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader className="bg-transparent">
            <TableRow className={cockpitTableHeadRow}>
              <TableHead className={cn('min-w-[160px]', cockpitThFirst)}>Ligne</TableHead>
              <TableHead className={cockpitThText}>Enveloppe</TableHead>
              <TableHead className={cockpitThNum}>Consommé</TableHead>
              <TableHead className={cockpitThNum}>Forecast</TableHead>
              <TableHead className={cockpitThNumLast}>Restant</TableHead>
              <TableHead className={cockpitThEndLeft}>Gravité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.lineId} className="border-border">
                <TableCell className={cn(cockpitTdFirst, 'min-w-[160px]')}>
                  {l.code ? `${l.code} — ` : ''}
                  {l.name}
                </TableCell>
                <TableCell className={cockpitTdText}>{l.envelopeName ?? '—'}</TableCell>
                <TableCell className={cockpitTdNum}>
                  {formatDashboardAmount({
                    ht: l.consumed,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className={cockpitTdNum}>
                  {formatDashboardAmount({
                    ht: l.forecast,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className={cockpitTdNumLast}>
                  {formatDashboardAmount({
                    ht: l.remaining,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className={cockpitTdEnd}>
                  <LineSeverityLabel level={l.lineRiskLevel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CockpitSurfaceCard>
    </CockpitSection>
  );
}
