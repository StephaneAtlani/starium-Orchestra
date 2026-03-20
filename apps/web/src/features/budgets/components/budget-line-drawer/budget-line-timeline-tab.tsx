'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useBudgetLineTimeline } from '../../hooks/use-budget-line-timeline';
import { TimelineFilters } from './timeline-filters';
import { TimelineEventItem } from './timeline-event-item';

export function BudgetLineTimelineTab({
  budgetLineId,
  lineCurrency,
  enabled,
}: {
  budgetLineId: string;
  lineCurrency: string;
  enabled: boolean;
}) {
  const { items, isLoading, isError, refetch, filters, setFilters } =
    useBudgetLineTimeline(enabled ? budgetLineId : null, lineCurrency, enabled);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          Impossible de charger la chronologie.
        </p>
        <p className="mt-1 text-muted-foreground">
          Une des sources (événements, allocations, commandes ou factures) n’a pas pu être
          chargée.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-1">
      <TimelineFilters filters={filters} onFiltersChange={setFilters} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Aucun événement financier</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajustez les filtres ou enregistrez des commandes, factures ou allocations sur cette
            ligne.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">
            {items.length} événement{items.length > 1 ? 's' : ''} affiché{items.length > 1 ? 's' : ''}
          </p>
          <div className="max-h-[min(360px,55vh)] overflow-y-auto overflow-x-hidden pr-1 [-ms-overflow-style:none] [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <ol className="flex list-none flex-col gap-3 pl-0" role="list" aria-label="Chronologie financière">
              {items.map((e) => (
                <TimelineEventItem key={e.id} event={e} />
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
