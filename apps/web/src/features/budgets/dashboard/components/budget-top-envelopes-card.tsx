'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { budgetEnvelopeEdit } from '@/features/budgets/constants/budget-routes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetCockpitEnvelopeRow } from '@/features/budgets/types/budget-dashboard.types';
import {
  formatDashboardAmount,
  resolveTtcDisplay,
} from '@/features/budgets/lib/budget-dashboard-format';
import { BudgetLinesProgress } from '@/features/budgets/components/budget-lines-progress';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import {
  cockpitTableHeadRow,
  cockpitTdAction,
  cockpitTdFirstAfterAction,
  cockpitTdNum,
  cockpitTdProgress,
  cockpitThAction,
  cockpitThFirstAfterAction,
  cockpitThNum,
  cockpitThProgress,
} from './budget-cockpit-table-classes';

export function BudgetTopEnvelopesCard({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  onEnvelopeClick,
}: {
  rows: BudgetCockpitEnvelopeRow[];
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onEnvelopeClick?: (envelopeId: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <CockpitSection
      id="budget-top-envelopes-heading"
      title="Enveloppes les plus consommées"
      description="Classement par montant consommé (10 lignes max.). Cliquez une ligne pour ouvrir le détail de l’enveloppe."
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
              <TableHead className={cockpitThAction}>
                <span className="sr-only">Actions</span>
              </TableHead>
              <TableHead className={cockpitThFirstAfterAction}>Enveloppe</TableHead>
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
                  onClick={() => onEnvelopeClick?.(e.envelopeId)}
                >
                  <TableCell
                    className={cockpitTdAction}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <Link
                      href={budgetEnvelopeEdit(e.envelopeId)}
                      className={cn(
                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                        'size-8 text-muted-foreground hover:text-foreground',
                      )}
                      aria-label={`Modifier l’enveloppe ${e.name}`}
                    >
                      <Pencil className="size-4 shrink-0" />
                    </Link>
                  </TableCell>
                  <TableCell className={cockpitTdFirstAfterAction}>
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
                      budgetAmount={revisedForProgress}
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
