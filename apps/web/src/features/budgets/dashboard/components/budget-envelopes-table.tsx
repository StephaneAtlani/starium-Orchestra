'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, Pencil } from 'lucide-react';
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
import type { BudgetCockpitRiskEnvelopeRow } from '@/features/budgets/types/budget-dashboard.types';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import { EnvelopeRiskLabel } from './budget-cockpit-status-labels';
import {
  cockpitTableHeadRow,
  cockpitTdAction,
  cockpitTdEnd,
  cockpitTdFirstAfterAction,
  cockpitTdNum,
  cockpitThAction,
  cockpitThEndLeft,
  cockpitThFirstAfterAction,
  cockpitThNum,
} from './budget-cockpit-table-classes';

export function BudgetEnvelopesTable({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  onEnvelopeClick,
}: {
  rows: BudgetCockpitRiskEnvelopeRow[];
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onEnvelopeClick?: (envelopeId: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <CockpitSection
      id="budget-risk-envelopes-heading"
      title="Pression sur les enveloppes"
      description="Enveloppes où la prévision dépasse ou approche le budget agrégé."
    >
      <CockpitSurfaceCard
        title="Enveloppes à risque"
        description="Prévision vs budget (agrégé enveloppe)"
        icon={Flame}
        accent="amber"
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
              <TableHead className={cockpitThNum}>Prévision</TableHead>
              <TableHead className={cockpitThNum}>Budget</TableHead>
              <TableHead className={cockpitThEndLeft}>Niveau</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
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
                    ht: e.forecast,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className={cockpitTdNum}>
                  {formatDashboardAmount({
                    ht: e.budgetAmount,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className={cockpitTdEnd}>
                  <EnvelopeRiskLabel level={e.riskLevel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CockpitSurfaceCard>
    </CockpitSection>
  );
}
