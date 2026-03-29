'use client';

import React from 'react';
import { TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatAmount } from '../lib/budget-formatters';
import {
  aggregateMonthsToQuarters,
  sumAmounts12,
  type Amounts12,
} from '../lib/budget-planning-grid';
import type { ExplorerLineNode } from '../types/budget-explorer.types';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '../types/budget-pilotage.types';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';
import { BudgetPlanningMonthCell } from './budget-planning-month-cell';

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
}: PilotageLineDataCellsProps) {
  if (mode === 'synthese') {
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
          <TableCell key={monthIndex0} className="min-w-[5.5rem] p-1 text-right align-middle">
            <BudgetPlanningMonthCell
              value={amt}
              currency={c}
              disabled={!editable}
              onCommit={(next) => onMonthCommit(line.id, monthIndex0, next)}
              aria-label={`${monthColumnLabels[monthIndex0] ?? `M${monthIndex0 + 1}`} — ${line.name}`}
            />
          </TableCell>
        ))}
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums font-medium">
          {formatAmount(total, c)}
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
    const total = sumAmounts12(amounts12);
    return (
      <>
        {[t1, t2, t3, t4].map((v, i) => (
          <TableCell key={i} className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatAmount(v, c)}
          </TableCell>
        ))}
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums font-medium">
          {formatAmount(total, c)}
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
