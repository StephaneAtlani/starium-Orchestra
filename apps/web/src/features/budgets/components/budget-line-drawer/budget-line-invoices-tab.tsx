'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BudgetLineEventsTable } from './budget-line-events-table';
import { EditProcurementEventDialog } from './edit-procurement-event-dialog';
import { useBudgetLineEvents } from '../../hooks/use-budget-line-events';
import { rangeLabel } from './pagination-label';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';

const DEFAULT_LIMIT = 20;
const EVENT_TYPE_INVOICE = 'CONSUMPTION_REGISTERED';

export function BudgetLineInvoicesTab({
  budgetId,
  budgetLineId,
  enabled,
}: {
  budgetId: string;
  budgetLineId: string;
  enabled: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [editEvent, setEditEvent] = useState<FinancialEventForLine | null>(null);

  useEffect(() => {
    setOffset(0);
  }, [budgetLineId]);

  const q = useBudgetLineEvents({
    budgetLineId,
    offset,
    limit: DEFAULT_LIMIT,
    eventType: EVENT_TYPE_INVOICE,
    enabled,
  });

  const events = useMemo(() => {
    const items = q.data?.items ?? [];
    // fallback si l’API ignore eventType
    return items.filter((e) => e.eventType === EVENT_TYPE_INVOICE);
  }, [q.data?.items]);

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
        <div className="text-destructive">Impossible de charger les factures.</div>
        <Button variant="outline" className="mt-3" onClick={() => q.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const total = q.data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + DEFAULT_LIMIT < total;

  return (
    <div className="space-y-3">
      <BudgetLineEventsTable
        events={events}
        showEditActions
        onEditEvent={(e) => setEditEvent(e)}
      />
      <EditProcurementEventDialog
        open={editEvent !== null}
        onOpenChange={(open) => {
          if (!open) setEditEvent(null);
        }}
        event={editEvent}
        budgetId={budgetId}
        budgetLineId={budgetLineId}
      />
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

