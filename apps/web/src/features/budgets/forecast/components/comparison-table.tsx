'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import type { BudgetComparisonResponse } from '@/features/budgets/types/budget-forecast.types';
import { ForecastStatusBadge } from './forecast-status-badge';
import { cn } from '@/lib/utils';
import { comparisonDiffClass } from '@/features/budgets/forecast/lib/comparison-diff';

function lineDiff(
  left: number,
  right: number,
): number {
  return right - left;
}

function ComparisonTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="comparison-table-skeleton">
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted/70" />
      ))}
    </div>
  );
}

export interface ComparisonTableProps {
  data: BudgetComparisonResponse | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function ComparisonTable({ data, isLoading, error }: ComparisonTableProps) {
  if (isLoading) {
    return <ComparisonTableSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="comparison-table-error">
        <AlertTitle>Comparaison impossible</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="comparison-table-empty">
        Aucune donnée disponible
      </p>
    );
  }

  if (data.lines.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="comparison-table-no-result"
      >
        Aucune ligne à comparer pour ce périmètre
      </p>
    );
  }

  const cur = data.currency;
  const sumLeftBudget = data.lines.reduce((s, r) => s + r.left.revisedAmount, 0);

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Ligne</TableHead>
            <TableHead className="text-right">Budget (gauche)</TableHead>
            <TableHead className="text-right">Budget (droite)</TableHead>
            <TableHead className="text-right">Diff.</TableHead>
            <TableHead className="text-right">Variance forecast</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.lines.map((row) => {
            const d = lineDiff(row.left.revisedAmount, row.right.revisedAmount);
            return (
              <TableRow key={row.lineKey} className="hover:bg-muted/50">
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.left.revisedAmount, cur)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.right.revisedAmount, cur)}
                </TableCell>
                <TableCell className={cn('text-right tabular-nums', comparisonDiffClass(d))}>
                  {formatCurrency(d, cur)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.varianceForecast, cur)}
                </TableCell>
                <TableCell>
                  <ForecastStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/30 font-medium hover:bg-muted/30">
            <TableCell>Totaux</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(sumLeftBudget, cur)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(data.totals.budget, cur)}
            </TableCell>
            <TableCell
              className={cn(
                'text-right tabular-nums',
                comparisonDiffClass(data.diff.revisedAmount),
              )}
            >
              {formatCurrency(data.diff.revisedAmount, cur)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(data.variance.forecast, cur)}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow className="text-xs text-muted-foreground hover:bg-muted/20">
            <TableCell colSpan={6}>
              Forecast agrégé (référence droite) : {formatCurrency(data.totals.forecast, cur)} ·
              Consommé : {formatCurrency(data.totals.consumed, cur)} · Variance consommation :{' '}
              {formatCurrency(data.variance.consumed, cur)} · Diff. forecast :{' '}
              {formatCurrency(data.diff.forecastAmount, cur)} · Diff. consommé :{' '}
              {formatCurrency(data.diff.consumedAmount, cur)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
