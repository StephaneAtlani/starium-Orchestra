'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import type { EnvelopeForecastLineItem } from '@/features/budgets/types/budget-forecast.types';
import { ForecastStatusBadge } from './forecast-status-badge';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { cn } from '@/lib/utils';

function ForecastTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="forecast-table-skeleton">
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted/70" />
      ))}
    </div>
  );
}

export interface ForecastTableProps {
  lines: EnvelopeForecastLineItem[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (nextOffset: number) => void;
  currency: string | null;
  isLoading: boolean;
  error: Error | null;
  onRowClick?: (line: EnvelopeForecastLineItem) => void;
}

export function ForecastTable({
  lines,
  total,
  offset,
  limit,
  onPageChange,
  currency,
  isLoading,
  error,
  onRowClick,
}: ForecastTableProps) {
  if (isLoading) {
    return <ForecastTableSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="forecast-table-error">
        <AlertTitle>Lignes forecast indisponibles</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (total === 0 && lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="forecast-table-empty">
        Aucune donnée disponible
      </p>
    );
  }

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Consommé</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Variance forecast</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((row) => (
              <TableRow
                key={row.lineId}
                className={cn(
                  'cursor-default',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                )}
                onClick={() => onRowClick?.(row)}
              >
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.budget, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.consumed, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.forecast, currency)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    row.varianceForecast > 0 && 'text-emerald-600 dark:text-emerald-400',
                    row.varianceForecast < 0 && 'text-red-600 dark:text-red-400',
                  )}
                >
                  {formatCurrency(row.varianceForecast, currency)}
                </TableCell>
                <TableCell>
                  <ForecastStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PaginationSummary offset={offset} limit={limit} total={total} />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => onPageChange(Math.max(0, offset - limit))}
          >
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => onPageChange(offset + limit)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
