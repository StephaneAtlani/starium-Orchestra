'use client';

import React from 'react';
import Link from 'next/link';
import { AlertOctagon, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import { LineSeverityLabel } from './budget-cockpit-status-labels';
import {
  cockpitTableHeadRow,
  cockpitTdEnd,
  cockpitTdEndRight,
  cockpitTdFirst,
  cockpitTdNum,
  cockpitTdText,
  cockpitThEndLeft,
  cockpitThEndRight,
  cockpitThFirst,
  cockpitThNum,
  cockpitThText,
} from './budget-cockpit-table-classes';

export function BudgetLinesCritiqueTable({
  rows,
  currency,
  budgetId,
  taxDisplayMode,
  defaultTaxRate,
  onBudgetLineClick,
}: {
  rows: NonNullable<BudgetDashboardResponse['criticalBudgetLines']>;
  currency: string;
  budgetId: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onBudgetLineClick?: (lineId: string) => void;
}) {
  const empty = (
    <CockpitSection
      id="budget-critical-lines-heading"
      title="Lignes sous surveillance"
      description="Lignes budgétaires en alerte WARNING ou CRITICAL."
    >
      <CockpitSurfaceCard
        title="Lignes critiques"
        description="Tri par gravité puis consommation (10 lignes max.)"
        icon={ShieldAlert}
        accent="rose"
        data-testid="budget-dashboard-critical-lines"
      >
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune ligne en alerte sur ce budget.
        </p>
      </CockpitSurfaceCard>
    </CockpitSection>
  );

  if (rows.length === 0) {
    return empty;
  }

  return (
    <CockpitSection
      id="budget-critical-lines-heading"
      title="Lignes sous surveillance"
      description="Lignes budgétaires en alerte WARNING ou CRITICAL."
    >
      <CockpitSurfaceCard
        title="Lignes critiques"
        description="Tri par gravité puis consommation (10 lignes max.)"
        icon={AlertOctagon}
        accent="rose"
        data-testid="budget-dashboard-critical-lines"
        contentPad={false}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className={cockpitTableHeadRow}>
                <TableHead className={cn('min-w-[140px]', cockpitThFirst)}>Ligne</TableHead>
                <TableHead className={cockpitThText}>Enveloppe</TableHead>
                <TableHead className={cockpitThNum}>Révisé</TableHead>
                <TableHead className={cockpitThNum}>Engagé</TableHead>
                <TableHead className={cockpitThNum}>Consommé</TableHead>
                <TableHead className={cockpitThNum}>Forecast</TableHead>
                <TableHead className={cockpitThEndLeft}>Gravité</TableHead>
                <TableHead className={cockpitThEndRight}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
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
                  className={cn(cockpitTdFirst, 'max-w-[200px] truncate')}
                >
                  {l.code ? `${l.code} — ` : ''}
                  {l.name}
                </TableCell>
                <TableCell className={cockpitTdText}>{l.envelopeName ?? '—'}</TableCell>
                <TableCell className={cockpitTdNum}>
                  {formatDashboardAmount({
                    ht: l.revisedAmount,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className={cockpitTdNum}>
                  {formatDashboardAmount({
                    ht: l.committed,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
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
                <TableCell className={cockpitTdEnd}>
                  <LineSeverityLabel level={l.lineRiskLevel} />
                </TableCell>
                <TableCell
                  className={cockpitTdEndRight}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={budgetDetail(budgetId)}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ouvrir le budget
                  </Link>
                </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CockpitSurfaceCard>
    </CockpitSection>
  );
}
