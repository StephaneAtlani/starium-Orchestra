'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';
import { listBudgetSnapshots } from '@/features/budgets/api/budget-snapshots.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { BudgetReportingForecastPage } from '@/features/budgets/forecast/budget-reporting-forecast-page';
import { BUDGET_LABELS } from '@/features/budgets/lib/budget-display-labels';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import {
  budgetSnapshots,
  budgetVersions,
} from '@/features/budgets/constants/budget-routes';

const SNAPSHOT_PREVIEW_COUNT = 5;

export interface BudgetComparisonsPanelProps {
  budgetId: string;
  onCreateSnapshot: () => void;
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

  const snapshotsQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
    queryFn: () => listBudgetSnapshots(authFetch, budgetId, { limit: 20, offset: 0 }),
    enabled: !!clientId && !!budgetId,
  });

  const snapshots = snapshotsQuery.data?.items ?? [];
  const previewed = snapshots.slice(0, SNAPSHOT_PREVIEW_COUNT);

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
    <div className="space-y-6" data-testid="budget-comparisons-panel">
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {BUDGET_LABELS.snapshot}s
            </h3>
            <p className="text-sm text-muted-foreground">
              Copies immuables du budget à une date donnée, servant de référence de comparaison.
            </p>
          </div>
          {createButton}
        </div>

        {snapshotsQuery.isLoading ? <LoadingState rows={3} /> : null}

        {snapshotsQuery.isError ? (
          <ErrorState
            message={
              (snapshotsQuery.error as Error)?.message ??
              'Impossible de charger les versions figées.'
            }
          />
        ) : null}

        {!snapshotsQuery.isLoading && !snapshotsQuery.isError && snapshots.length === 0 ? (
          <EmptyState
            title="Aucune version figée"
            description="Figez une version pour comparer l’évolution du budget dans le temps."
            action={createButton}
          />
        ) : null}

        {previewed.length > 0 ? (
          <>
            <ul className="space-y-2">
              {previewed.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/70 bg-muted/20 px-4 py-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {snapshot.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {snapshot.occasionTypeLabel ?? 'Type non renseigné'} · figée au{' '}
                      <time
                        dateTime={snapshot.snapshotDate || snapshot.createdAt}
                        className="tabular-nums"
                      >
                        {new Date(
                          snapshot.snapshotDate || snapshot.createdAt,
                        ).toLocaleDateString('fr-FR')}
                      </time>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(snapshot.totalInitialAmount, snapshot.budgetCurrency)}
                    </span>
                    <Link
                      href={`${budgetSnapshots(budgetId)}/${snapshot.id}`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'min-h-11 sm:min-h-9',
                      )}
                    >
                      Ouvrir
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link
                href={budgetSnapshots(budgetId)}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                Toutes les versions figées
                {snapshots.length > previewed.length ? ` (${snapshots.length})` : ''}
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
          </>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Comparaison détaillée</h3>
        <BudgetReportingForecastPage budgetId={budgetId} variant="embedded" />
      </section>
    </div>
  );
}
