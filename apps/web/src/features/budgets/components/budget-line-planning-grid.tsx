'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getExerciseMonthColumnLabels } from '@starium-orchestra/budget-exercise-calendar';
import { cn } from '@/lib/utils';
import { formatAmount } from '../lib/budget-formatters';
import { useBudgetLinePlanning, useUpdateBudgetLinePlanningManualMutation } from '../hooks/use-budget-line-planning';
import type { BudgetLinePlanningMonth } from '../types/budget-line-planning.types';
import type { ApiFormError } from '../api/types';
import { BudgetLinePlanningLandingSummary } from './budget-line-planning-landing-summary';

interface BudgetLinePlanningGridProps {
  lineId: string;
  budgetId: string | null;
  currency: string;
  canEdit: boolean;
  className?: string;
  onError?: (error: ApiFormError) => void;
}

const MONTH_LABELS_FALLBACK = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function normalizeMonths(months: BudgetLinePlanningMonth[] | undefined | null): BudgetLinePlanningMonth[] {
  const byIndex = new Map<number, number>();
  for (const m of months ?? []) {
    byIndex.set(m.monthIndex, m.amount);
  }

  const result: BudgetLinePlanningMonth[] = [];
  for (let i = 1; i <= 12; i += 1) {
    result.push({
      monthIndex: i,
      amount: byIndex.get(i) ?? 0,
    });
  }
  return result;
}

export function BudgetLinePlanningGrid({
  lineId,
  budgetId,
  currency,
  canEdit,
  className,
  onError,
}: BudgetLinePlanningGridProps) {
  const { data, isLoading, error } = useBudgetLinePlanning(lineId);
  const [months, setMonths] = useState<BudgetLinePlanningMonth[]>(() => normalizeMonths([]));
  const [isDirty, setIsDirty] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const mutation = useUpdateBudgetLinePlanningManualMutation(lineId, budgetId);

  useEffect(() => {
    if (error && onError) {
      onError(error as ApiFormError);
    }
  }, [error, onError]);

  useEffect(() => {
    if (data) {
      setMonths(normalizeMonths(data.months));
      setIsDirty(false);
    }
  }, [data]);

  const total = useMemo(
    () => months.reduce((sum, m) => sum + (Number.isFinite(m.amount) ? m.amount : 0), 0),
    [months],
  );

  const monthLabels = useMemo(() => {
    if (data?.monthColumnLabels?.length === 12) {
      return data.monthColumnLabels;
    }
    if (data?.exerciseStartDate) {
      return getExerciseMonthColumnLabels(new Date(data.exerciseStartDate));
    }
    return MONTH_LABELS_FALLBACK;
  }, [data?.monthColumnLabels, data?.exerciseStartDate]);

  const handleChangeAmount = (index: number, raw: string) => {
    setMonths((prev) => {
      const next = [...prev];
      const current = next[index];
      const value = raw === '' ? 0 : Number(raw.replace(',', '.'));
      next[index] = { ...current, amount: Number.isNaN(value) ? current.amount : value };
      return next;
    });
    setIsDirty(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const col = index;
    const cols = 12;

    if (e.key === 'ArrowLeft' && col > 0) {
      e.preventDefault();
      inputRefs.current[col - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && col < cols - 1) {
      e.preventDefault();
      inputRefs.current[col + 1]?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (col < cols - 1) {
        inputRefs.current[col + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0);
    if (rows.length === 0) return;

    const values = rows[0].split('\t').map((cell) => cell.trim());
    if (values.length === 0) return;

    e.preventDefault();
    setMonths((prev) => {
      const next = [...prev];
      for (let offset = 0; offset < values.length; offset += 1) {
        const col = index + offset;
        if (col >= next.length) break;
        const parsed = Number(values[offset].replace(',', '.'));
        if (!Number.isNaN(parsed)) {
          next[col] = { ...next[col], amount: parsed };
        }
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleFillToRight = (index: number) => {
    const value = months[index]?.amount ?? 0;
    setMonths((prev) => {
      const next = [...prev];
      for (let col = index + 1; col < next.length; col += 1) {
        next[col] = { ...next[col], amount: value };
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        months: months.map((m) => ({
          monthIndex: m.monthIndex,
          amount: m.amount,
        })),
      });
      setIsDirty(false);
    } catch (err) {
      if (onError && err && typeof err === 'object') {
        onError(err as ApiFormError);
      }
    }
  };

  if (isLoading && !data) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement du planning…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={cn('py-4 text-sm text-red-600', className)}>
        Erreur lors du chargement du planning de la ligne.
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {data && (
        <BudgetLinePlanningLandingSummary data={data} currency={currency} />
      )}
      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/60">
              {monthLabels.map((label) => (
                <th
                  key={label}
                  className="whitespace-nowrap border-b border-r px-2 py-1 text-right font-medium text-muted-foreground"
                >
                  {label}
                </th>
              ))}
              <th className="whitespace-nowrap border-b px-2 py-1 text-right font-semibold text-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {months.map((m, index) => (
                <td
                  key={m.monthIndex}
                  className="border-r px-1 py-1 align-middle"
                >
                  <div className="flex items-center gap-1">
                    {canEdit ? (
                      <input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="number"
                        step="0.01"
                        min={0}
                        className="h-7 w-full rounded border border-input bg-background px-1 text-right text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        defaultValue={m.amount}
                        onChange={(e) => handleChangeAmount(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onPaste={(e) => handlePaste(e, index)}
                      />
                    ) : (
                      <span className="w-full text-right tabular-nums">
                        {formatAmount(m.amount, currency)}
                      </span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-dashed border-input bg-muted/40 px-1 text-[9px] text-muted-foreground hover:border-border hover:bg-muted"
                        onClick={() => handleFillToRight(index)}
                        title="Étendre cette valeur vers la droite"
                      >
                        →
                      </button>
                    )}
                  </div>
                </td>
              ))}
              <td className="px-2 py-1 text-right align-middle text-xs font-semibold tabular-nums">
                {formatAmount(total, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {data && (
              <>
                <span className="mr-2">
                  Total révisé :{' '}
                  <span className="font-medium">
                    {formatAmount(data.revisedAmount, currency)}
                  </span>
                </span>
                <span>
                  Écart prévision vs révisé :{' '}
                  <span
                    className={cn(
                      'font-medium',
                      (data.planningDelta ?? data.deltaVsRevised ?? 0) === 0
                        ? 'text-muted-foreground'
                        : (data.planningDelta ?? data.deltaVsRevised ?? 0) > 0
                          ? 'text-amber-600'
                          : 'text-blue-600',
                    )}
                  >
                    {formatAmount(data.planningDelta ?? data.deltaVsRevised ?? 0, currency)}
                  </span>
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || mutation.isPending}
            className={cn(
              'inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium',
              isDirty
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-input bg-muted text-muted-foreground',
            )}
          >
            {mutation.isPending && (
              <Loader2 className="mr-1 size-3 animate-spin" />
            )}
            Enregistrer le planning
          </button>
        </div>
      )}
    </div>
  );
}

