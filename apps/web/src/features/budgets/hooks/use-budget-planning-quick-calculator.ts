'use client';

import { useCallback, useMemo, useState } from 'react';

const FALLBACK_MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface UseBudgetPlanningQuickCalculatorOptions {
  monthColumnLabels?: string[];
}

export function useBudgetPlanningQuickCalculator({
  monthColumnLabels,
}: UseBudgetPlanningQuickCalculatorOptions) {
  const [calcQuantity, setCalcQuantity] = useState<number | ''>('');
  const [calcUnitPrice, setCalcUnitPrice] = useState<number | ''>('');
  const [monthValues, setMonthValues] = useState<number[]>(() => Array(12).fill(0));

  const planningMonthLabels = useMemo(
    () => (monthColumnLabels?.length === 12 ? monthColumnLabels : FALLBACK_MONTH_LABELS),
    [monthColumnLabels],
  );

  const monthTotal = useMemo(
    () => monthValues.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [monthValues],
  );

  const effectiveTotal = useMemo(() => {
    const hasMonths = monthValues.some((v) => v > 0);
    const qty = calcQuantity === '' ? 0 : Number(calcQuantity);
    const unit = calcUnitPrice === '' ? 0 : Number(calcUnitPrice);
    const qp = !Number.isNaN(qty) && !Number.isNaN(unit) ? qty * unit : 0;
    if (hasMonths) return monthTotal;
    return qp;
  }, [calcQuantity, calcUnitPrice, monthTotal, monthValues]);

  const canApplyCalculetteTotal = useMemo(() => {
    if (!Number.isFinite(effectiveTotal)) return false;
    return Number(effectiveTotal.toFixed(2)) > 0;
  }, [effectiveTotal]);

  const hasMonthAttribution = useMemo(
    () => monthValues.some((v) => Number.isFinite(v) && v > 0),
    [monthValues],
  );

  const applySpread = useCallback(
    (mode: 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'FIRST_MONTH' | 'LAST_MONTH') => {
      if (!Number.isFinite(effectiveTotal) || Number(effectiveTotal.toFixed(2)) <= 0) return;

      if (mode === 'MONTHLY') {
        const value = Number((effectiveTotal / 12).toFixed(2));
        setMonthValues(Array(12).fill(value));
        return;
      }

      if (mode === 'QUARTERLY') {
        const activeMonths = [1, 4, 7, 10];
        const per = Number((effectiveTotal / activeMonths.length).toFixed(2));
        setMonthValues(
          Array.from({ length: 12 }, (_, i) => (activeMonths.includes(i + 1) ? per : 0)),
        );
        return;
      }

      if (mode === 'SEMESTER') {
        const activeMonths = [1, 7];
        const per = Number((effectiveTotal / activeMonths.length).toFixed(2));
        setMonthValues(
          Array.from({ length: 12 }, (_, i) => (activeMonths.includes(i + 1) ? per : 0)),
        );
        return;
      }

      if (mode === 'FIRST_MONTH') {
        setMonthValues(Array.from({ length: 12 }, (_, i) => (i === 0 ? effectiveTotal : 0)));
        return;
      }

      if (mode === 'LAST_MONTH') {
        setMonthValues(Array.from({ length: 12 }, (_, i) => (i === 11 ? effectiveTotal : 0)));
      }
    },
    [effectiveTotal],
  );

  const reset = useCallback((seed?: readonly number[] | null) => {
    setCalcQuantity('');
    setCalcUnitPrice('');
    if (seed && seed.length === 12) {
      setMonthValues([...seed]);
    } else {
      setMonthValues(Array(12).fill(0));
    }
  }, []);

  /** Multiplie chaque mois par (1 ± p/100) selon augmentation ou réduction. */
  const applyPercentToMonths = useCallback(
    (percent: number, direction: 'increase' | 'decrease') => {
      const p = Math.abs(Number(percent));
      if (!Number.isFinite(p) || p < 0) return;
      const factor =
        direction === 'increase' ? 1 + p / 100 : Math.max(0, 1 - p / 100);
      setMonthValues((prev) =>
        prev.map((v) => {
          const base = Number.isFinite(v) ? v : 0;
          return Number((base * factor).toFixed(2));
        }),
      );
    },
    [],
  );

  return {
    calcQuantity,
    setCalcQuantity,
    calcUnitPrice,
    setCalcUnitPrice,
    monthValues,
    setMonthValues,
    planningMonthLabels,
    monthTotal,
    effectiveTotal,
    canApplyCalculetteTotal,
    hasMonthAttribution,
    applySpread,
    applyPercentToMonths,
    reset,
  };
}

export type BudgetPlanningQuickCalculatorState = ReturnType<
  typeof useBudgetPlanningQuickCalculator
>;
