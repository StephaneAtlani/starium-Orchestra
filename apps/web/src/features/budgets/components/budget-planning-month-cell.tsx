'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatAmount } from '../lib/budget-formatters';

export interface BudgetPlanningMonthCellProps {
  value: number;
  currency: string;
  disabled: boolean;
  onCommit: (next: number) => void;
  'aria-label'?: string;
}

/**
 * Cellule mois isolée (memo) — limite les re-renders du tableau lors de la saisie.
 */
export const BudgetPlanningMonthCell = memo(function BudgetPlanningMonthCell({
  value,
  currency,
  disabled,
  onCommit,
  'aria-label': ariaLabel,
}: BudgetPlanningMonthCellProps) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = useCallback(() => {
    const normalized = text.replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    if (Number.isFinite(n) && n >= 0) {
      onCommit(n);
    } else {
      setText(String(value));
    }
  }, [text, value, onCommit]);

  if (disabled) {
    return (
      <span className="block text-right tabular-nums">{formatAmount(value, currency)}</span>
    );
  }

  return (
    <Input
      className="h-8 w-[5.5rem] tabular-nums text-right text-sm"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
      aria-label={ariaLabel}
    />
  );
});
