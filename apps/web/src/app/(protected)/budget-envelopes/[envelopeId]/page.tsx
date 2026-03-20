'use client';

import React, { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { ListTree } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BudgetLineIntelligenceDrawer,
  type BudgetLineDrawerTab,
} from '@/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer';
import { useBudgetEnvelope, useBudgetEnvelopeLines } from '@/features/budgets/hooks/use-budget-envelope';
import { BudgetEnvelopeHeader } from '@/features/budgets/components/budget-envelope-header';
import { BudgetEnvelopeIdentityCard } from '@/features/budgets/components/budget-envelope-identity-card';
import { BudgetEnvelopeContextCard } from '@/features/budgets/components/budget-envelope-context-card';
import { BudgetEnvelopeSummaryCards } from '@/features/budgets/components/budget-envelope-summary-cards';
import { BudgetEnvelopeLinesTable } from '@/features/budgets/components/budget-envelope-lines-table';
import { CockpitSurfaceCard } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';

const DEFAULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function BudgetEnvelopeDetailPage() {
  const envelopeId = (() => {
    const p = useParams();
    return typeof p.envelopeId === 'string' ? p.envelopeId : null;
  })();

  const [offset, setOffset] = React.useState(0);
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, statusFilter]);

  const linesQueryParams = React.useMemo(
    () => ({
      offset,
      limit: DEFAULT_LIMIT,
      search: debouncedSearch || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [offset, debouncedSearch, statusFilter],
  );

  const envelopeQuery = useBudgetEnvelope(envelopeId);
  const linesQuery = useBudgetEnvelopeLines(envelopeId, linesQueryParams);

  const isLoading = envelopeQuery.isLoading || linesQuery.isLoading;
  const error = envelopeQuery.error ?? linesQuery.error;

  const envelope = envelopeQuery.data ?? null;

  const hasActiveFilters =
    searchInput.trim().length > 0 || statusFilter !== 'ALL';

  const [isLineDrawerOpen, setIsLineDrawerOpen] = useState(false);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string | null>(
    null,
  );
  const [lineDrawerTab, setLineDrawerTab] = useState<BudgetLineDrawerTab>(
    'overview',
  );

  const openBudgetLineDrawer = useCallback((lineId: string) => {
    setSelectedBudgetLineId(lineId);
    setLineDrawerTab('overview');
    setIsLineDrawerOpen(true);
  }, []);

  const onLineDrawerOpenChange = useCallback((open: boolean) => {
    setIsLineDrawerOpen(open);
    if (!open) {
      setSelectedBudgetLineId(null);
      setLineDrawerTab('overview');
    }
  }, []);

  return (
    <RequireActiveClient>
      <PageContainer>
        {isLoading && !envelope && (
          <>
            <div className="mb-4 h-10 w-1/2 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="h-40 rounded bg-muted animate-pulse" />
              <div className="h-40 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-24 rounded bg-muted animate-pulse" />
          </>
        )}

        {!isLoading && (error || !envelope) && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Enveloppe budgétaire
            </h1>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aucune enveloppe à afficher</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  L’enveloppe demandée est introuvable ou vous n’y avez pas accès.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {envelope && (
          <>
            <div className="mb-4">
              <BudgetEnvelopeHeader envelope={envelope} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <BudgetEnvelopeIdentityCard envelope={envelope} />
              <BudgetEnvelopeContextCard envelope={envelope} />
            </div>

            <BudgetEnvelopeSummaryCards envelope={envelope} />

            <CockpitSurfaceCard
              title="Lignes budgétaires de l’enveloppe"
              description="Recherche par code ou libellé, filtre par statut, pagination."
              icon={ListTree}
              accent="primary"
              contentPad={false}
              bodyClassName="p-0"
              data-testid="budget-envelope-lines-table"
            >
              <BudgetEnvelopeLinesTable
                lines={linesQuery.data?.items ?? []}
                isLoading={linesQuery.isLoading}
                error={linesQuery.error}
                total={linesQuery.data?.total ?? 0}
                offset={offset}
                limit={DEFAULT_LIMIT}
                onPageChange={setOffset}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                hasActiveFilters={hasActiveFilters}
                onBudgetLineClick={openBudgetLineDrawer}
              />
            </CockpitSurfaceCard>

            <BudgetLineIntelligenceDrawer
              open={isLineDrawerOpen}
              onOpenChange={onLineDrawerOpenChange}
              budgetId={envelope.budgetId}
              budgetName={envelope.budgetName}
              envelopeName={null}
              envelopeCode={null}
              envelopeType={null}
              budgetLineId={selectedBudgetLineId}
              activeTab={lineDrawerTab}
              onActiveTabChange={setLineDrawerTab}
            />
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
