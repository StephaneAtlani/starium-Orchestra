'use client';

import React from 'react';
import { TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { formatAmount } from '../lib/budget-formatters';
import {
  aggregateMonthsToQuarters,
  spreadTotalEvenlyAcross12,
  sumAmounts12,
  type Amounts12,
} from '../lib/budget-planning-grid';
import type { ExplorerLineNode } from '../types/budget-explorer.types';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '../types/budget-pilotage.types';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';
import { BudgetPlanningMonthCell } from './budget-planning-month-cell';

function annualInitialRevisedForTaxDisplay(
  line: ExplorerLineNode,
  taxDisplayMode: TaxDisplayMode,
): { initialAnnual: number; revisedAnnual: number } {
  const initialAnnual =
    taxDisplayMode === 'TTC' && line.initialAmountTtc != null
      ? line.initialAmountTtc
      : line.initialAmount;
  const revisedAnnual =
    taxDisplayMode === 'TTC' && line.revisedAmountTtc != null
      ? line.revisedAmountTtc
      : line.revisedAmount;
  return { initialAnnual, revisedAnnual };
}

export function PilotageEnvelopeDataCells({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: colCount }, (_, i) => (
        <TableCell
          key={i}
          className="min-w-[6.75rem] whitespace-nowrap text-right text-muted-foreground"
        >
          —
        </TableCell>
      ))}
    </>
  );
}

export interface PilotageLineDataCellsProps {
  line: ExplorerLineNode;
  mode: BudgetPilotageMode;
  density: BudgetPilotageDensity;
  monthColumnLabels: string[];
  planning: BudgetLinePlanningResponse | undefined;
  planningRowLoading: boolean;
  amounts12: Amounts12 | null;
  canEditPlanning: boolean;
  isMutating: boolean;
  onMonthCommit: (lineId: string, monthIndex0: number, amount: number) => void;
  /** Aligné sur le sélecteur HT/TTC de la page budget. */
  taxDisplayMode?: TaxDisplayMode;
}

export function PilotageLineDataCells({
  line,
  mode,
  density,
  monthColumnLabels,
  planning,
  planningRowLoading,
  amounts12,
  canEditPlanning,
  isMutating,
  onMonthCommit,
  taxDisplayMode = 'HT',
}: PilotageLineDataCellsProps) {
  const { initialAnnual, revisedAnnual } = annualInitialRevisedForTaxDisplay(line, taxDisplayMode);
  const initial12 = spreadTotalEvenlyAcross12(initialAnnual);
  const revised12 = spreadTotalEvenlyAcross12(revisedAnnual);

  if (mode === 'synthese' || mode === 'dashboard') {
    return null;
  }
  const c = line.currency;
  const showSkeleton = planningRowLoading && !planning;

  if (mode === 'previsionnel' && density === 'mensuel') {
    if (showSkeleton) {
      return (
        <>
          {monthColumnLabels.map((_, i) => (
            <TableCell key={i} className="text-right text-muted-foreground">
              …
            </TableCell>
          ))}
          <TableCell className="text-right text-muted-foreground">…</TableCell>
        </>
      );
    }
    if (!amounts12) {
      return (
        <>
          {monthColumnLabels.map((_, i) => (
            <TableCell key={i} className="text-right text-muted-foreground">
              —
            </TableCell>
          ))}
          <TableCell className="text-right text-muted-foreground">—</TableCell>
        </>
      );
    }
    const total = sumAmounts12(amounts12);
    const editable = canEditPlanning && !isMutating;
    return (
      <>
        {amounts12.map((amt, monthIndex0) => (
          <TableCell
            key={monthIndex0}
            className="min-w-[6.25rem] max-w-[7rem] p-1 align-top text-right"
          >
            <div className="flex flex-col items-end gap-1">
              <BudgetPlanningMonthCell
                value={amt}
                currency={c}
                disabled={!editable}
                onCommit={(next) => onMonthCommit(line.id, monthIndex0, next)}
                aria-label={`${monthColumnLabels[monthIndex0] ?? `M${monthIndex0 + 1}`} — ${line.name}`}
              />
              <div
                className="w-full text-[10px] leading-tight text-muted-foreground"
                title="Référence : budget initial et révisé répartis uniformément sur 12 mois (aligné exercice)."
              >
                <div className="flex justify-end gap-x-1 tabular-nums">
                  <span>init. {formatAmount(initial12[monthIndex0] ?? 0, c)}</span>
                </div>
                <div className="flex justify-end gap-x-1 tabular-nums">
                  <span>rév. {formatAmount(revised12[monthIndex0] ?? 0, c)}</span>
                </div>
              </div>
            </div>
          </TableCell>
        ))}
        <TableCell className="min-w-[7rem] whitespace-nowrap text-right align-top tabular-nums">
          <div className="flex flex-col items-end gap-1">
            <span className="font-medium">{formatAmount(total, c)}</span>
            <div
              className="text-[10px] leading-tight text-muted-foreground"
              title="Totaux annuels budget initial et révisé (ligne)."
            >
              <div>init. {formatAmount(initialAnnual, c)}</div>
              <div>rév. {formatAmount(revisedAnnual, c)}</div>
            </div>
          </div>
        </TableCell>
      </>
    );
  }

  if (mode === 'previsionnel' && density === 'condense') {
    if (showSkeleton || !amounts12) {
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableCell key={i} className="text-right text-muted-foreground">
              {showSkeleton ? '…' : '—'}
            </TableCell>
          ))}
        </>
      );
    }
    const [t1, t2, t3, t4] = aggregateMonthsToQuarters(amounts12);
    const [i1, i2, i3, i4] = aggregateMonthsToQuarters(initial12);
    const [r1, r2, r3, r4] = aggregateMonthsToQuarters(revised12);
    const total = sumAmounts12(amounts12);
    const quarterPairs: { v: number; initQ: number; revQ: number }[] = [
      { v: t1, initQ: i1, revQ: r1 },
      { v: t2, initQ: i2, revQ: r2 },
      { v: t3, initQ: i3, revQ: r3 },
      { v: t4, initQ: i4, revQ: r4 },
    ];
    return (
      <>
        {quarterPairs.map(({ v, initQ, revQ }, i) => (
          <TableCell key={i} className="min-w-[6.75rem] align-top text-right tabular-nums">
            <div className="flex flex-col items-end gap-1">
              <span>{formatAmount(v, c)}</span>
              <div className="text-[10px] leading-tight text-muted-foreground">
                <div>init. {formatAmount(initQ, c)}</div>
                <div>rév. {formatAmount(revQ, c)}</div>
              </div>
            </div>
          </TableCell>
        ))}
        <TableCell className="min-w-[7rem] whitespace-nowrap text-right align-top tabular-nums">
          <div className="flex flex-col items-end gap-1">
            <span className="font-medium">{formatAmount(total, c)}</span>
            <div className="text-[10px] leading-tight text-muted-foreground">
              <div>init. {formatAmount(initialAnnual, c)}</div>
              <div>rév. {formatAmount(revisedAnnual, c)}</div>
            </div>
          </div>
        </TableCell>
      </>
    );
  }

  if (mode === 'atterrissage') {
    if (showSkeleton || !planning) {
      return (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TableCell key={i} className="text-right text-muted-foreground">
              {showSkeleton ? '…' : '—'}
            </TableCell>
          ))}
        </>
      );
    }
    const over = planning.landingVariance > 0;
    return (
      <>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatAmount(planning.revisedAmount, c)}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatAmount(planning.consumedAmount, c)}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatAmount(planning.committedAmount, c)}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatAmount(planning.remainingPlanning, c)}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatAmount(planning.landing, c)}
        </TableCell>
        <TableCell
          className={cn(
            'min-w-[6.75rem] whitespace-nowrap text-right tabular-nums',
            over && 'text-destructive font-medium',
          )}
        >
          {formatAmount(planning.landingVariance, c)}
        </TableCell>
      </>
    );
  }

  /* forecast baseline MVP */
  if (showSkeleton || !planning) {
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <TableCell key={i} className="text-right text-muted-foreground">
            {showSkeleton ? '…' : '—'}
          </TableCell>
        ))}
      </>
    );
  }
  const over = planning.landingVariance > 0;
  return (
    <>
      <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
        {formatAmount(planning.revisedAmount, c)}
      </TableCell>
      <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
        {formatAmount(planning.planningTotalAmount, c)}
      </TableCell>
      <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
        {formatAmount(planning.landing, c)}
      </TableCell>
      <TableCell
        className={cn(
          'min-w-[6.75rem] whitespace-nowrap text-right tabular-nums',
          over && 'text-destructive font-medium',
        )}
      >
        {formatAmount(planning.landingVariance, c)}
      </TableCell>
    </>
  );
}
