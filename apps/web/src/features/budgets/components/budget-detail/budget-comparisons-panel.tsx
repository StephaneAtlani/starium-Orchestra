'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { listBudgetSnapshots } from '@/features/budgets/api/budget-snapshots.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { BudgetReportingForecastPage } from '@/features/budgets/forecast/budget-reporting-forecast-page';
import { snapshotDisplayLabel } from '@/features/budgets/forecast/components/budget-comparison-selector';
import { CockpitSection } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import { formatCurrency, formatDate } from '@/features/budgets/lib/budget-formatters';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import {
  budgetSnapshots,
  budgetVersions,
} from '@/features/budgets/constants/budget-routes';
import type { BudgetSnapshotSummaryDto } from '@/features/budgets/types/budget-snapshots-list.types';

/** Aperçu paginé : 5 versions par page (les plus récentes en premier). */
const SNAPSHOT_PAGE_SIZE = 5;

export interface BudgetComparisonsPanelProps {
  budgetId: string;
  onCreateSnapshot: () => void;
}

function SnapshotPreviewRow({
  snapshot,
  budgetId,
  isLatest,
}: {
  snapshot: BudgetSnapshotSummaryDto;
  budgetId: string;
  isLatest: boolean;
}) {
  const label = snapshotDisplayLabel(snapshot);
  const href = `${budgetSnapshots(budgetId)}/${snapshot.id}`;
  const capturedAt = snapshot.snapshotDate || snapshot.createdAt;
  const occasion = snapshot.occasionTypeLabel?.trim();
  const author = displayLabel(snapshot.createdByLabel, 'Auteur non renseigné');

  return (
    <li>
      <Link
        href={href}
        aria-label={`Ouvrir ${label}`}
        className={cn(
          'group flex min-h-11 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card px-3 py-3 pl-4 shadow-[var(--ds-card-shadow)]',
          'transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]',
          'sm:gap-4 sm:px-4',
        )}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          aria-hidden
        >
          <Bookmark className="size-4" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-foreground sm:text-base">
              {label}
            </span>
            {isLatest ? (
              <Badge variant="outline" className="rounded-full px-2 py-px text-[11px] font-semibold">
                Plus récente
              </Badge>
            ) : null}
            {occasion ? (
              <Badge
                variant="secondary"
                className="max-w-full truncate rounded-full px-2 py-px text-[11px] font-medium"
              >
                {occasion}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Figée le{' '}
            <time dateTime={capturedAt} className="tabular-nums">
              {formatDate(capturedAt)}
            </time>
            <span aria-hidden> · </span>
            <span>{author}</span>
            <span className="sm:hidden">
              <span aria-hidden> · </span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(snapshot.totalInitialAmount, snapshot.budgetCurrency)}
              </span>
            </span>
          </p>
        </div>

        <div className="hidden shrink-0 self-center sm:flex sm:min-w-[7.5rem] sm:justify-center">
          <div className="text-center text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(snapshot.totalInitialAmount, snapshot.budgetCurrency)}
          </div>
        </div>

        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[color:var(--brand-gold-700)]"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/**
 * Onglet Comparaisons (RFC-FE-BUD-032 §3.B) : versions figées du budget + comparaison
 * détaillée (RFC-FE-BUD-030) et accès aux révisions (RFC-019).
 */
export function BudgetComparisonsPanel({
  budgetId,
  onCreateSnapshot,
}: BudgetComparisonsPanelProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [offset, setOffset] = useState(0);

  const snapshotsQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId, {
      limit: SNAPSHOT_PAGE_SIZE,
      offset,
    }),
    queryFn: () =>
      listBudgetSnapshots(authFetch, budgetId, {
        limit: SNAPSHOT_PAGE_SIZE,
        offset,
      }),
    enabled: !!clientId && !!budgetId,
  });

  const snapshots = snapshotsQuery.data?.items ?? [];
  const total = snapshotsQuery.data?.total ?? 0;
  const limit = snapshotsQuery.data?.limit ?? SNAPSHOT_PAGE_SIZE;
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
    <PermissionGate permission="budgets.create">
      <Button
        type="button"
        size="sm"
        className="min-h-11 sm:min-h-9"
        onClick={onCreateSnapshot}
      >
        <Bookmark className="size-4" aria-hidden />
        Enregistrer une version
      </Button>
    </PermissionGate>
  );

  return (
    <div className="space-y-8" data-testid="budget-comparisons-panel">
      <CockpitSection
        id="budget-snapshots-preview"
        title="Versions figées"
        description="Photos immuables du budget, pour comparer un instant T au live."
        action={createButton}
      >
        {snapshotsQuery.isLoading ? <LoadingState rows={3} /> : null}

        {snapshotsQuery.isError ? (
          <ErrorState
            message={
              (snapshotsQuery.error as Error)?.message ??
              'Impossible de charger les versions figées.'
            }
          />
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        total === 0 ? (
          <EmptyState
            title="Aucune version figée"
            description="Figez une version pour comparer l’évolution du budget dans le temps."
            action={createButton}
          />
        ) : null}

        {snapshots.length > 0 ? (
          <div className="space-y-4">
            <ul className="space-y-2" role="list">
              {snapshots.map((snapshot, index) => (
                <SnapshotPreviewRow
                  key={snapshot.id}
                  snapshot={snapshot}
                  budgetId={budgetId}
                  isLatest={offset === 0 && index === 0}
                />
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="starium-table-footer flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
                <PaginationSummary offset={offset} limit={limit} total={total} />
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
                offset={offset}
                limit={limit}
                total={total}
                className="border-t border-border/70 pt-4 text-sm text-muted-foreground"
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={budgetSnapshots(budgetId)}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                Toutes les versions figées
                {total > 0 ? ` (${total})` : ''}
              </Link>
              <Link
                href={budgetVersions(budgetId)}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                Révisions du budget
              </Link>
            </div>
          </div>
        ) : null}
      </CockpitSection>

      <BudgetReportingForecastPage budgetId={budgetId} variant="embedded" />
    </div>
  );
}
