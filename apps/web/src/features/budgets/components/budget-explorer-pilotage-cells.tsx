'use client';

import React from 'react';
import { Calculator } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { formatAmount, formatSignedDeltaPercent } from '../lib/budget-formatters';
import {
  aggregateMonthsToQuarters,
  sumAmounts12,
  type Amounts12,
} from '../lib/budget-planning-grid';
import type { ExplorerLineNode } from '../types/budget-explorer.types';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '../types/budget-pilotage.types';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';
import { BudgetPlanningMonthCell } from './budget-planning-month-cell';

function annualBudgetForTaxDisplay(line: ExplorerLineNode, taxDisplayMode: TaxDisplayMode): number {
  return taxDisplayMode === 'TTC' && line.budgetAmountTtc != null
    ? line.budgetAmountTtc
    : line.budgetAmount;
}

/** Écart somme prévision 12 mois vs budget (aligné GET planning `planningDelta`). */
function planningDeltaVsBudget(
  planning: BudgetLinePlanningResponse | undefined,
  amounts12: Amounts12 | null,
  budgetAnnual: number,
): number | null {
  if (planning) return planning.planningDelta;
  if (amounts12) return sumAmounts12(amounts12) - budgetAnnual;
  return null;
}

/** (prévision totale − budget) / budget — aligné sur l’écart absolu. */
function planningDeltaPercentLabel(
  delta: number | null,
  budgetAnnual: number,
): string | null {
  if (delta == null) return null;
  return formatSignedDeltaPercent(budgetAnnual + delta, budgetAnnual);
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
  /** Si défini, contrôle calculette + commentaire ; sinon retombe sur `canEditPlanning`. */
  canEditPrevisionnelMeta?: boolean;
  isMutating: boolean;
  onMonthCommit: (lineId: string, monthIndex0: number, amount: number) => void;
  /** Aligné sur le sélecteur HT/TTC de la page budget. */
  taxDisplayMode?: TaxDisplayMode;
  onOpenPlanningCalculator?: (lineId: string) => void;
  onLineCommentCommit?: (lineId: string, description: string) => void;
  savingCommentLineId?: string | null;
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
  canEditPrevisionnelMeta,
  isMutating,
  onMonthCommit,
  taxDisplayMode = 'HT',
  onOpenPlanningCalculator,
  onLineCommentCommit,
  savingCommentLineId,
}: PilotageLineDataCellsProps) {
  const budgetAnnual = annualBudgetForTaxDisplay(line, taxDisplayMode);
  const canMeta =
    canEditPrevisionnelMeta !== undefined ? canEditPrevisionnelMeta : canEditPlanning;

  if (mode === 'synthese' || mode === 'dashboard') {
    return null;
  }
  const c = line.currency;
  const showSkeleton = planningRowLoading && !planning;

  if (mode === 'previsionnel' && density === 'mensuel') {
    const commentBusy = savingCommentLineId === line.id;
    const delta = planningDeltaVsBudget(planning, amounts12, budgetAnnual);
    const overDelta = delta != null && delta > 0;

    if (showSkeleton) {
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableCell key={`lead-${i}`} className="text-muted-foreground">
              …
            </TableCell>
          ))}
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
          {[0, 1, 2, 3, 4].map((i) => (
            <TableCell key={`lead-${i}`} className="text-muted-foreground">
              —
            </TableCell>
          ))}
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
        <TableCell className="w-[88px] min-w-[88px] p-1 align-middle text-center">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 shrink-0"
            disabled={
              !canMeta ||
              !onOpenPlanningCalculator ||
              isMutating ||
              commentBusy
            }
            title="Calculette rapide — remplir le prévisionnel"
            aria-label={`Calculette prévisionnel — ${line.name}`}
            onClick={() => onOpenPlanningCalculator?.(line.id)}
          >
            <Calculator className="size-4" aria-hidden />
          </Button>
        </TableCell>
        <TableCell className="min-w-[6.5rem] whitespace-nowrap text-right tabular-nums align-middle">
          {formatAmount(budgetAnnual, c)}
        </TableCell>
        <TableCell
          className={cn(
            'min-w-[6.5rem] whitespace-nowrap text-right tabular-nums align-middle',
            overDelta && 'text-destructive font-medium',
          )}
        >
          {delta != null ? formatAmount(delta, c) : '—'}
        </TableCell>
        <TableCell
          className={cn(
            'min-w-[5rem] whitespace-nowrap text-right tabular-nums align-middle',
            overDelta && 'text-destructive font-medium',
          )}
        >
          {planningDeltaPercentLabel(delta, budgetAnnual) ?? '—'}
        </TableCell>
        <TableCell className="min-w-[12rem] max-w-[16rem] p-1 align-middle">
          <textarea
            key={`${line.id}-${line.description ?? ''}`}
            rows={2}
            defaultValue={line.description ?? ''}
            readOnly={!canMeta || commentBusy}
            disabled={commentBusy}
            placeholder="Note…"
            aria-label={`Commentaire — ${line.name}`}
            className={cn(
              'min-h-[52px] w-full max-w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 read-only:bg-muted/30',
            )}
            onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              const next = e.target.value.trim();
              const prev = (line.description ?? '').trim();
              if (next === prev || !onLineCommentCommit) return;
              onLineCommentCommit(line.id, e.target.value);
            }}
          />
        </TableCell>
        {amounts12.map((amt, monthIndex0) => (
          <TableCell
            key={monthIndex0}
            className="min-w-[6.25rem] max-w-[7rem] p-1 align-top text-right"
          >
            <BudgetPlanningMonthCell
              value={amt}
              currency={c}
              disabled={!editable}
              onCommit={(next) => onMonthCommit(line.id, monthIndex0, next)}
              aria-label={`${monthColumnLabels[monthIndex0] ?? `M${monthIndex0 + 1}`} — ${line.name}`}
            />
          </TableCell>
        ))}
        <TableCell className="min-w-[7rem] whitespace-nowrap text-right align-top tabular-nums">
          <span className="font-medium">{formatAmount(total, c)}</span>
        </TableCell>
      </>
    );
  }

  if (mode === 'previsionnel' && density === 'condense') {
    const commentBusy = savingCommentLineId === line.id;
    const delta = planningDeltaVsBudget(planning, amounts12, budgetAnnual);
    const overDelta = delta != null && delta > 0;

    if (showSkeleton || !amounts12) {
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableCell key={`lead-${i}`} className="text-muted-foreground">
              {showSkeleton ? '…' : '—'}
            </TableCell>
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <TableCell key={`q-${i}`} className="text-right text-muted-foreground">
              {showSkeleton ? '…' : '—'}
            </TableCell>
          ))}
        </>
      );
    }
    const [t1, t2, t3, t4] = aggregateMonthsToQuarters(amounts12);
    const total = sumAmounts12(amounts12);
    const quarters = [t1, t2, t3, t4];
    return (
      <>
        <TableCell className="w-[88px] min-w-[88px] p-1 align-middle text-center">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 shrink-0"
            disabled={
              !canMeta ||
              !onOpenPlanningCalculator ||
              isMutating ||
              commentBusy
            }
            title="Calculette rapide — remplir le prévisionnel"
            aria-label={`Calculette prévisionnel — ${line.name}`}
            onClick={() => onOpenPlanningCalculator?.(line.id)}
          >
            <Calculator className="size-4" aria-hidden />
          </Button>
        </TableCell>
        <TableCell className="min-w-[6.5rem] whitespace-nowrap text-right tabular-nums align-middle">
          {formatAmount(budgetAnnual, c)}
        </TableCell>
        <TableCell
          className={cn(
            'min-w-[6.5rem] whitespace-nowrap text-right tabular-nums align-middle',
            overDelta && 'text-destructive font-medium',
          )}
        >
          {delta != null ? formatAmount(delta, c) : '—'}
        </TableCell>
        <TableCell
          className={cn(
            'min-w-[5rem] whitespace-nowrap text-right tabular-nums align-middle',
            overDelta && 'text-destructive font-medium',
          )}
        >
          {planningDeltaPercentLabel(delta, budgetAnnual) ?? '—'}
        </TableCell>
        <TableCell className="min-w-[12rem] max-w-[16rem] p-1 align-middle">
          <textarea
            key={`${line.id}-${line.description ?? ''}`}
            rows={2}
            defaultValue={line.description ?? ''}
            readOnly={!canMeta || commentBusy}
            disabled={commentBusy}
            placeholder="Note…"
            aria-label={`Commentaire — ${line.name}`}
            className={cn(
              'min-h-[52px] w-full max-w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 read-only:bg-muted/30',
            )}
            onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              const next = e.target.value.trim();
              const prev = (line.description ?? '').trim();
              if (next === prev || !onLineCommentCommit) return;
              onLineCommentCommit(line.id, e.target.value);
            }}
          />
        </TableCell>
        {quarters.map((v, i) => (
          <TableCell key={i} className="min-w-[6.75rem] align-top text-right tabular-nums">
            {formatAmount(v, c)}
          </TableCell>
        ))}
        <TableCell className="min-w-[7rem] whitespace-nowrap text-right align-top tabular-nums">
          <span className="font-medium">{formatAmount(total, c)}</span>
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
          {formatAmount(planning.budgetAmount, c)}
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
        {formatAmount(planning.budgetAmount, c)}
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
