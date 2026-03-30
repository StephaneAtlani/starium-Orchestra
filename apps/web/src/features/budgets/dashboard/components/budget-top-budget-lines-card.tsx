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
import type { BudgetDashboardLineRow } from '@/features/budgets/types/budget-dashboard.types';
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

function lineLabel(code: string | null | undefined, name: string) {
  return code ? `${code} — ${name}` : name;
}

export function BudgetTopBudgetLinesCard({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  onBudgetLineClick,
}: {
  rows: BudgetDashboardLineRow[];
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onBudgetLineClick?: (lineId: string) => void;
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
        <Table className="min-w-[880px] table-fixed">
          <colgroup>
            <col className="w-[3.25rem]" />
            <col className="w-[30%]" />
            <col className="w-[24%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[5rem]" />
          </colgroup>
          <TableHeader className="bg-transparent">
            <TableRow className={cockpitTableHeadRow}>
              <TableHead
                scope="col"
                className={cn(
                  'h-auto min-h-11 w-[3.25rem] min-w-[3.25rem] py-3 pl-5 pr-1 text-center align-middle font-semibold tabular-nums text-muted-foreground',
                )}
              >
                #
              </TableHead>
              <TableHead className={cn('min-w-0', cockpitThFirst)}>
                Ligne
              </TableHead>
              <TableHead className={cn('min-w-0', cockpitThText)}>Enveloppe</TableHead>
              <TableHead className={cn(cockpitThNum, 'whitespace-nowrap')}>
                Consommé
              </TableHead>
              <TableHead className={cn(cockpitThNum, 'whitespace-nowrap')}>
                Forecast
              </TableHead>
              <TableHead className={cn(cockpitThNumLast, 'whitespace-nowrap')}>
                Restant
              </TableHead>
              <TableHead className={cn(cockpitThEndLeft, 'whitespace-nowrap')}>
                Gravité
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l, index) => {
              const lineText = lineLabel(l.code, l.name);
              const envText = l.envelopeName?.trim() || '';
              return (
                <TableRow
                  key={l.lineId}
                  className={cn(
                    'border-border',
                    onBudgetLineClick && 'cursor-pointer hover:bg-muted/50',
                  )}
                  onClick={
                    onBudgetLineClick
                      ? () => onBudgetLineClick(l.lineId)
                      : undefined
                  }
                >
                  <TableCell
                    className={cn(
                      'w-[3.25rem] min-w-[3.25rem] py-2.5 pl-5 pr-1 text-center align-middle tabular-nums text-sm text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </TableCell>
                  <TableCell className={cn(cockpitTdFirst, 'max-w-0')}>
                    <span className="block truncate" title={lineText}>
                      {lineText}
                    </span>
                  </TableCell>
                  <TableCell className={cn(cockpitTdText, 'max-w-0')}>
                    {envText ? (
                      <span className="block truncate" title={envText}>
                        {envText}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                    {formatDashboardAmount({
                      ht: l.consumed,
                      currency,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </TableCell>
                  <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                    {formatDashboardAmount({
                      ht: l.forecast,
                      currency,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </TableCell>
                  <TableCell className={cn(cockpitTdNumLast, 'whitespace-nowrap')}>
                    {formatDashboardAmount({
                      ht: l.remaining,
                      currency,
                      mode: taxDisplayMode,
                      defaultTaxRate,
                    })}
                  </TableCell>
                  <TableCell className={cn(cockpitTdEnd, 'whitespace-nowrap')}>
                    <LineSeverityLabel level={l.lineRiskLevel} />
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
