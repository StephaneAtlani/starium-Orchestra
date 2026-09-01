'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowRightLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { listBudgetReallocations } from '@/features/budgets/api/budget-reallocations.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { CockpitSection } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';
import type { BudgetReallocationItem } from '@/features/budgets/types/budget-reallocations.types';

const PAGE_SIZE = 10;

export interface BudgetReallocationsPanelProps {
  budgetId: string;
  lines: BudgetLine[];
  onCreateRequest: () => void;
}

function formatLineLabel(line: BudgetLine | undefined, fallback: string): string {
  if (!line) return fallback;
  const name = displayLabel(line.name, 'Ligne sans nom');
  return line.code ? `${name} (${line.code})` : name;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function ReallocationJournalRow({
  item,
  sourceLabel,
  targetLabel,
}: {
  item: BudgetReallocationItem;
  sourceLabel: string;
  targetLabel: string;
}) {
  const reason = item.reason?.trim();

  return (
    <li>
      <article
        className={cn(
          'flex min-h-11 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card px-3 py-3 pl-4 shadow-[var(--ds-card-shadow)]',
          'sm:gap-4 sm:px-4',
        )}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300"
          aria-hidden
        >
          <ArrowRightLeft className="size-4" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-foreground sm:text-base">
            <span className="max-w-[min(100%,14rem)] truncate">{sourceLabel}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="max-w-[min(100%,14rem)] truncate">{targetLabel}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <time dateTime={item.createdAt} className="tabular-nums">
              {formatDateTime(item.createdAt)}
            </time>
            {reason ? (
              <>
                <span aria-hidden> · </span>
                <span className="line-clamp-2">{reason}</span>
              </>
            ) : null}
            <span className="sm:hidden">
              <span aria-hidden> · </span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(item.amount, item.currency)}
              </span>
            </span>
          </p>
        </div>

        <div className="hidden shrink-0 self-center sm:flex sm:min-w-[7.5rem] sm:justify-center">
          <div className="text-center text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(item.amount, item.currency)}
          </div>
        </div>
      </article>
    </li>
  );
}

/**
 * Journal des réaffectations entre lignes + création (RFC-017), rendu en panneau intégré à la
 * fiche budget — remplace l'ancienne modale « Réaffectations ».
 */
export function BudgetReallocationsPanel({
  budgetId,
  lines,
  onCreateRequest,
}: BudgetReallocationsPanelProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: budgetQueryKeys.reallocations(clientId, budgetId, {
      offset,
      limit: PAGE_SIZE,
    }),
    queryFn: () =>
      listBudgetReallocations(authFetch, { budgetId, offset, limit: PAGE_SIZE }),
    enabled: !!clientId && !!budgetId,
  });

  const lineMap = useMemo(
    () => new Map(lines.map((line) => [line.id, line])),
    [lines],
  );

  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? PAGE_SIZE;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevTotalRef.current != null && total > prevTotalRef.current) {
      setOffset(0);
    }
    prevTotalRef.current = total;
  }, [total]);

  const createButton = (
    <PermissionGate permission="budgets.update">
      <Button
        type="button"
        size="sm"
        className="min-h-11 sm:min-h-9"
        onClick={onCreateRequest}
      >
        <Plus className="size-4" aria-hidden />
        Nouvelle réaffectation
      </Button>
    </PermissionGate>
  );

  return (
    <div data-testid="budget-reallocations-panel">
      <CockpitSection
        id="budget-reallocations-journal"
        title="Journal des réaffectations"
        description="Transferts de budget entre lignes, tracés et réversibles uniquement par un nouveau mouvement."
        action={createButton}
      >
      {query.isLoading ? <LoadingState rows={4} /> : null}

      {query.error ? (
        <ErrorState
          message={
            query.error instanceof Error ? query.error.message : 'Une erreur est survenue.'
          }
        />
      ) : null}

      {!query.isLoading && !query.error && total === 0 ? (
        <EmptyState
          title="Aucune réaffectation"
          description="Aucun mouvement n’a encore été enregistré pour ce budget."
          action={createButton}
        />
      ) : null}

      {!query.isLoading && !query.error && query.data && query.data.items.length > 0 ? (
        <div className="space-y-4">
          <ul className="space-y-2" role="list">
            {query.data.items.map((item) => {
              const sourceLine = lineMap.get(item.sourceLineId);
              const targetLine = lineMap.get(item.targetLineId);
              return (
                <ReallocationJournalRow
                  key={item.id}
                  item={item}
                  sourceLabel={formatLineLabel(sourceLine, 'Ligne source supprimée')}
                  targetLabel={formatLineLabel(targetLine, 'Ligne cible supprimée')}
                />
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="starium-table-footer flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
              <PaginationSummary
                offset={query.data.offset}
                limit={query.data.limit}
                total={query.data.total}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  disabled={currentPage <= 1}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Précédent
                </Button>
                <span className="px-2 text-xs tabular-nums text-muted-foreground">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset(offset + limit)}
                >
                  Suivant
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : (
            <PaginationSummary
              offset={query.data.offset}
              limit={query.data.limit}
              total={query.data.total}
              className="border-t border-border/70 pt-4 text-sm text-muted-foreground"
            />
          )}
        </div>
      ) : null}
      </CockpitSection>
    </div>
  );
}
