'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listBudgetReallocations } from '@/features/budgets/api/budget-reallocations.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';

const PAGE_SIZE = 20;

export interface BudgetReallocationsPanelProps {
  budgetId: string;
  lines: BudgetLine[];
  onCreateRequest: () => void;
}

function formatLineLabel(line: BudgetLine | undefined, fallback: string): string {
  if (!line) return fallback;
  return line.code ? `${line.name} (${line.code})` : line.name;
}

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
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
    <div className="space-y-4" data-testid="budget-reallocations-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Journal des réaffectations
          </h3>
          <p className="text-sm text-muted-foreground">
            Transferts de budget entre lignes, tracés et réversibles uniquement par un nouveau
            mouvement.
          </p>
        </div>
        {createButton}
      </div>

      {query.isLoading ? <LoadingState rows={4} /> : null}

      {query.error ? (
        <ErrorState
          message={
            query.error instanceof Error ? query.error.message : 'Une erreur est survenue.'
          }
        />
      ) : null}

      {!query.isLoading && !query.error && (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Aucune réaffectation"
          description="Aucun mouvement n’a encore été enregistré pour ce budget."
          action={createButton}
        />
      ) : null}

      {!query.isLoading && !query.error && query.data && query.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {query.data.items.map((item) => {
              const sourceLine = lineMap.get(item.sourceLineId);
              const targetLine = lineMap.get(item.targetLineId);
              return (
                <li
                  key={item.id}
                  className="rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formatLineLabel(sourceLine, 'Ligne source supprimée')}
                        <span className="mx-2 text-muted-foreground" aria-hidden>
                          →
                        </span>
                        {formatLineLabel(targetLine, 'Ligne cible supprimée')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <time dateTime={item.createdAt} className="tabular-nums">
                          {new Date(item.createdAt).toLocaleString('fr-FR')}
                        </time>
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatAmount(item.amount, item.currency)}
                    </p>
                  </div>
                  {item.reason ? (
                    <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="starium-table-footer flex flex-wrap items-center justify-between gap-2">
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
          ) : null}
        </>
      ) : null}
    </div>
  );
}
