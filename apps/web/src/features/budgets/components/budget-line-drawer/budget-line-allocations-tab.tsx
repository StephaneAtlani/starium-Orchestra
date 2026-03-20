'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBudgetLineAllocations } from '../../hooks/use-budget-line-allocations';
import { formatAmount } from '../../lib/budget-formatters';
import { rangeLabel } from './pagination-label';
import { formatFinancialSourceType } from '../../lib/financial-event-labels';

const DEFAULT_LIMIT = 20;

export function BudgetLineAllocationsTab({
  budgetLineId,
  enabled,
}: {
  budgetLineId: string;
  enabled: boolean;
}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [budgetLineId]);

  const q = useBudgetLineAllocations({
    budgetLineId,
    offset,
    limit: DEFAULT_LIMIT,
    enabled,
  });

  if (!enabled) return null;

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="py-6 text-sm">
        <div className="text-destructive">Impossible de charger les allocations.</div>
        <Button variant="outline" className="mt-3" onClick={() => q.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + DEFAULT_LIMIT < total;

  if (items.length === 0) {
    return <div className="py-6 text-sm text-muted-foreground">Aucune allocation.</div>;
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-muted-foreground">
                {new Date(a.effectiveDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground">{a.allocationType}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatFinancialSourceType(a.sourceType)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(a.allocatedAmount, a.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.notes ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{rangeLabel(offset, DEFAULT_LIMIT, total)}</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOffset((o) => Math.max(0, o - DEFAULT_LIMIT))}
            disabled={!canPrev}
          >
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOffset((o) => o + DEFAULT_LIMIT)}
            disabled={!canNext}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

