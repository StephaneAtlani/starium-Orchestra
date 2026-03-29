'use client';

import { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrencyAmountFr } from '@/lib/currency-format';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';
import type { BudgetPilotageDensity, BudgetPilotageView } from '../types/budget-pilotage.types';
import {
  aggregateExerciseQuarters,
  planningMonthsToTwelveArray,
  replaceMonthAmount,
  sumTwelveMonths,
} from '../lib/budget-planning-grid';

export interface BudgetTableRowModel {
  lineId: string;
  lineLabel: string;
  planning?: BudgetLinePlanningResponse;
  isLoading: boolean;
  isError: boolean;
}

export interface BudgetTableProps {
  currency: string;
  monthLabels: string[];
  view: BudgetPilotageView;
  density: BudgetPilotageDensity;
  rows: BudgetTableRowModel[];
  canUpdate: boolean;
  draftMonthsByLineId: Record<string, number[]>;
  onDraftChange: (lineId: string, months12: number[]) => void;
  onCommitRow: (lineId: string, months12: number[]) => void;
  pendingLineId: string | null;
}

function formatAmt(value: number, currency: string) {
  return formatCurrencyAmountFr(value, currency);
}

function getTwelveMonths(
  row: BudgetTableRowModel,
  draftMonthsByLineId: Record<string, number[]>,
): number[] {
  const d = draftMonthsByLineId[row.lineId];
  if (d && d.length === 12) return d;
  return [...planningMonthsToTwelveArray(row.planning?.months)];
}

export function BudgetTable({
  currency,
  monthLabels,
  view,
  density,
  rows,
  canUpdate,
  draftMonthsByLineId,
  onDraftChange,
  onCommitRow,
  pendingLineId,
}: BudgetTableProps) {
  const onMonthInputChange = useCallback(
    (lineId: string, monthIndex1To12: number, raw: string, row: BudgetTableRowModel) => {
      const parsed = parseFloat(raw.replace(',', '.'));
      const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      const base = getTwelveMonths(row, draftMonthsByLineId);
      const next = replaceMonthAmount(base, monthIndex1To12, amount);
      onDraftChange(lineId, next);
    },
    [draftMonthsByLineId, onDraftChange],
  );

  const onMonthBlur = useCallback(
    (lineId: string, row: BudgetTableRowModel) => {
      const months12 = getTwelveMonths(row, draftMonthsByLineId);
      onCommitRow(lineId, months12);
    },
    [draftMonthsByLineId, onCommitRow],
  );

  const showPrevisionnelMensuel = view === 'previsionnel' && density === 'mensuel';
  const showPrevisionnelCondense = view === 'previsionnel' && density === 'condense';

  const loadingColSpan =
    showPrevisionnelMensuel ? 13 : showPrevisionnelCondense ? 5 : view === 'atterrissage' ? 6 : 4;

  return (
    <div className="overflow-x-auto border border-border/60">
      <Table className="min-w-[56rem]">
        <TableHeader>
          {showPrevisionnelMensuel && (
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[12rem] bg-background">Ligne</TableHead>
              {monthLabels.map((label, i) => (
                <TableHead key={i} className="text-right">
                  {label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          )}
          {showPrevisionnelCondense && (
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[12rem] bg-background">Ligne</TableHead>
              {['T1', 'T2', 'T3', 'T4'].map((q) => (
                <TableHead key={q} className="text-right">
                  {q}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          )}
          {view === 'atterrissage' && (
            <TableRow>
              <TableHead className="min-w-[12rem]">Ligne</TableHead>
              <TableHead className="text-right">Budget révisé</TableHead>
              <TableHead className="text-right">Consommé</TableHead>
              <TableHead className="text-right">Engagé</TableHead>
              <TableHead className="text-right">Prévision restante</TableHead>
              <TableHead className="text-right">Atterrissage</TableHead>
              <TableHead className="text-right">Écart</TableHead>
            </TableRow>
          )}
          {view === 'forecast' && (
            <TableRow>
              <TableHead className="min-w-[12rem]">Ligne</TableHead>
              <TableHead className="text-right">Budget révisé</TableHead>
              <TableHead className="text-right">Forecast (Baseline)</TableHead>
              <TableHead className="text-right">Atterrissage</TableHead>
              <TableHead className="text-right">Écart</TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const pending = pendingLineId === row.lineId;
            const twelve = getTwelveMonths(row, draftMonthsByLineId);
            const quarters = aggregateExerciseQuarters(twelve);
            const p = row.planning;

            if (row.isLoading) {
              return (
                <TableRow key={row.lineId}>
                  <TableCell className="font-medium text-muted-foreground">{row.lineLabel}</TableCell>
                  <TableCell colSpan={loadingColSpan} className="text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              );
            }
            if (row.isError) {
              return (
                <TableRow key={row.lineId}>
                  <TableCell className="font-medium text-destructive">{row.lineLabel}</TableCell>
                  <TableCell colSpan={loadingColSpan} className="text-destructive">
                    Erreur de chargement du planning
                  </TableCell>
                </TableRow>
              );
            }

            if (showPrevisionnelMensuel) {
              return (
                <TableRow key={row.lineId}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {row.lineLabel}
                  </TableCell>
                  {twelve.map((amt, idx) => (
                    <TableCell key={idx} className="p-1 text-right">
                      {canUpdate ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8 w-[5.5rem] text-right tabular-nums"
                          disabled={pending}
                          value={String(amt)}
                          onChange={(e) =>
                            onMonthInputChange(row.lineId, idx + 1, e.target.value, row)
                          }
                          onBlur={() => onMonthBlur(row.lineId, row)}
                        />
                      ) : (
                        <span className="tabular-nums">{formatAmt(amt, currency)}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatAmt(sumTwelveMonths(twelve), currency)}
                  </TableCell>
                </TableRow>
              );
            }

            if (showPrevisionnelCondense) {
              return (
                <TableRow key={row.lineId}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {row.lineLabel}
                  </TableCell>
                  {quarters.map((q, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {formatAmt(q, currency)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatAmt(sumTwelveMonths(twelve), currency)}
                  </TableCell>
                </TableRow>
              );
            }

            if (view === 'atterrissage' && p) {
              const ecart = p.landingVariance;
              const bad = ecart > 0;
              return (
                <TableRow key={row.lineId}>
                  <TableCell className="font-medium">{row.lineLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.revisedAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.consumedAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.committedAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.remainingPlanning, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.landing, currency)}
                  </TableCell>
                  <TableCell
                    className={cn('text-right tabular-nums', bad && 'font-medium text-destructive')}
                  >
                    {formatAmt(ecart, currency)}
                  </TableCell>
                </TableRow>
              );
            }

            if (view === 'forecast' && p) {
              const ecart = p.landingVariance;
              const bad = ecart > 0;
              return (
                <TableRow key={row.lineId}>
                  <TableCell className="font-medium">{row.lineLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.revisedAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.planningTotalAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmt(p.landing, currency)}
                  </TableCell>
                  <TableCell
                    className={cn('text-right tabular-nums', bad && 'font-medium text-destructive')}
                  >
                    {formatAmt(ecart, currency)}
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={row.lineId}>
                <TableCell className="text-muted-foreground">{row.lineLabel}</TableCell>
                <TableCell colSpan={loadingColSpan} className="text-muted-foreground">
                  —
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
