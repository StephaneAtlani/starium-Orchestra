'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BudgetLinesProgressProps {
  budgetAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  currency?: string;
  className?: string;
}

/**
 * Barre Consommé X% / Solde Y% — pourcentages dérivés des props (montant budgétaire comme base).
 */
export function BudgetLinesProgress({
  budgetAmount,
  consumedAmount,
  remainingAmount,
  currency,
  className,
}: BudgetLinesProgressProps) {
  const base = budgetAmount > 0 ? budgetAmount : 1;
  const consumedPercent = Math.min(100, (consumedAmount / base) * 100);
  const remainingPercent = Math.min(100, (remainingAmount / base) * 100);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>Consommé {consumedPercent.toFixed(1)}%</span>
        <span>Solde {remainingPercent.toFixed(1)}%</span>
      </div>
      <div className="flex h-2 w-full min-w-[4rem] overflow-hidden rounded-md bg-muted">
        <div
          className="bg-primary/70 transition-all"
          style={{ width: `${consumedPercent}%` }}
          role="progressbar"
          aria-valuenow={consumedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <div
          className="bg-muted-foreground/30 transition-all"
          style={{ width: `${remainingPercent}%` }}
        />
      </div>
    </div>
  );
}
