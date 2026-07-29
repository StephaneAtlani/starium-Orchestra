'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { useBudgetExplorer } from '@/features/budgets/hooks/use-budget-explorer';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { listBudgetReallocations } from '@/features/budgets/api/budget-reallocations.api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRightLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CreateBudgetReallocationDialog } from '@/features/budgets/components/create-budget-reallocation-dialog';
import Link from 'next/link';
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import { cn } from '@/lib/utils';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';

export default function BudgetReallocationsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [offset, setOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { budget, lines, isLoading: explorerLoading } = useBudgetExplorer(budgetId);

  const query = useQuery({
    queryKey: budgetQueryKeys.reallocations(clientId, budgetId, { offset, limit: 20 }),
    queryFn: () => listBudgetReallocations(authFetch, { budgetId, offset, limit: 20 }),
    enabled: !!clientId && !!budgetId,
  });

  const lineMap = useMemo(
    () => new Map((lines ?? []).map((line: BudgetLine) => [line.id, line])),
    [lines],
  );

  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatAmount = (value: number, currency: string) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Pilotage › Budgets"
          title="Réallocations"
          description={
            budget
              ? `${budget.name}${budget.code ? ` (${budget.code})` : ''} — journal et demandes de réallocation.`
              : `Budget ${budgetId} — journal et demandes de réallocation.`
          }
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Link
                href={budgetDetail(budgetId)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <ArrowRightLeft className="size-4" aria-hidden />
                Retour budget
              </Link>
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Nouvelle réaffectation
              </Button>
            </div>
          }
        />

        {explorerLoading || query.isLoading ? <LoadingState rows={4} /> : null}

        {query.error ? (
          <Alert variant="destructive">
            <AlertTitle>Impossible de charger les réallocations</AlertTitle>
            <AlertDescription>
              {query.error instanceof Error ? query.error.message : 'Une erreur est survenue.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!query.isLoading && !query.error && (query.data?.items.length ?? 0) === 0 ? (
          <BudgetEmptyState
            title="Aucune réaffectation"
            description="Aucune demande n’a encore été enregistrée pour ce budget."
            action={
              <Button type="button" onClick={() => setDialogOpen(true)}>
                Créer une réaffectation
              </Button>
            }
          />
        ) : null}

        {!query.isLoading && !query.error && query.data && query.data.items.length > 0 ? (
          <Card className="starium-panel overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="starium-section-title">Journal des réallocations</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/70 p-0">
              {query.data.items.map((item) => {
                const sourceLine = lineMap.get(item.sourceLineId);
                const targetLine = lineMap.get(item.targetLineId);
                return (
                  <div key={item.id} className="space-y-3 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {sourceLine?.name ?? item.sourceLineId}
                          <span className="mx-2 text-muted-foreground" aria-hidden>
                            →
                          </span>
                          {targetLine?.name ?? item.targetLineId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {formatAmount(item.amount, item.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.currency}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Ligne source
                        </div>
                        <div className="mt-1 font-medium text-foreground">
                          {sourceLine?.name ?? item.sourceLineId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sourceLine?.code ?? 'Sans code'} · Reste {sourceLine ? formatAmount(sourceLine.remainingAmount, sourceLine.currency) : '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Ligne cible
                        </div>
                        <div className="mt-1 font-medium text-foreground">
                          {targetLine?.name ?? item.targetLineId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {targetLine?.code ?? 'Sans code'}
                        </div>
                      </div>
                    </div>
                    {item.reason ? (
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
            <CardFooter className="starium-table-footer p-0">
              <PaginationSummary offset={query.data.offset} limit={query.data.limit} total={query.data.total} />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="starium-filter-chip px-2.5 py-1 text-[11.5px] disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Précédent
                </button>
                <span className="starium-filter-chip starium-filter-chip--active px-2.5 py-1 text-[11.5px]">
                  {currentPage}
                </span>
                {totalPages > 1 ? (
                  <span className="px-1 text-xs text-muted-foreground">/ {totalPages}</span>
                ) : null}
                <button
                  type="button"
                  className="starium-filter-chip px-2.5 py-1 text-[11.5px] disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset(offset + limit)}
                >
                  Suivant
                  <ChevronRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </CardFooter>
          </Card>
        ) : null}

        <CreateBudgetReallocationDialog
          budgetId={budgetId}
          lines={(lines ?? []) as BudgetLine[]}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
