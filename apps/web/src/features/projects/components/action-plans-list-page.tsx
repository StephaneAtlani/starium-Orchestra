'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useActionPlansListQuery } from '@/features/projects/hooks/use-action-plans-list-query';
import { ActionPlanCreateDialog } from '@/features/projects/components/action-plan-create-dialog';
import {
  ActionPlansFiltersBar,
  type ActionPlansListFilters,
} from '@/features/projects/components/action-plans-filters-bar';
import { ActionPlansListCards } from '@/features/projects/components/action-plans-list-cards';

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: ActionPlansListFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  owner: 'all',
};

export function ActionPlansListPage() {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const listEnabled = !!clientId && permsSuccess && canRead;

  const [filters, setFilters] = useState<ActionPlansListFilters>(DEFAULT_FILTERS);
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const apiParams = useMemo(
    () => ({
      search: filters.search.trim() || undefined,
      status:
        filters.status !== 'all'
          ? (filters.status as 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED')
          : undefined,
      priority:
        filters.priority !== 'all'
          ? (filters.priority as 'LOW' | 'MEDIUM' | 'HIGH')
          : undefined,
      owner:
        filters.owner === 'ASSIGNED' || filters.owner === 'UNASSIGNED'
          ? (filters.owner as 'ASSIGNED' | 'UNASSIGNED')
          : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [filters, offset],
  );

  const { data, isLoading, error, refetch, isRefetching } = useActionPlansListQuery(
    apiParams,
    { enabled: listEnabled },
  );

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.owner !== 'all';

  const total = data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  function patchFilters(patch: Partial<ActionPlansListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setOffset(0);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setOffset(0);
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Pilotage › Plans d'action"
          title="Plans d'action"
          description="Sélectionnez un plan d'action à piloter — par projet ou vue consolidée."
          actions={
            <PermissionGate permission="projects.update">
              <Button
                type="button"
                size="sm"
                className="min-h-11 gap-1.5 md:min-h-0"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" aria-hidden />
                Nouveau plan
              </Button>
            </PermissionGate>
          }
        />

        <ActionPlansFiltersBar
          filters={filters}
          onFiltersChange={patchFilters}
          onReset={resetFilters}
          onRefresh={() => void refetch()}
          isRefreshing={isRefetching}
          hasActiveFilters={hasActiveFilters}
        />

        <section className="space-y-3" aria-labelledby="action-plans-choose-label">
          <h2 id="action-plans-choose-label" className="starium-mb-sec-label">
            Choisir un plan d&apos;action
          </h2>

          {listEnabled && isLoading ? (
            <LoadingState rows={6} />
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>Impossible de charger les plans d&apos;action.</AlertDescription>
            </Alert>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Aucun plan d'action"
              description={
                hasActiveFilters || filters.search.trim()
                  ? 'Aucun plan ne correspond aux filtres sélectionnés.'
                  : 'Créez un plan pour regrouper des tâches de pilotage.'
              }
            />
          ) : data ? (
            <ActionPlansListCards items={data.items} />
          ) : null}

          {data && data.items.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
              <p>
                {total} plan{total > 1 ? 's' : ''} au total
                {data.items.length < total
                  ? ` · ${data.items.length} affiché${data.items.length > 1 ? 's' : ''} sur cette page`
                  : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 md:min-h-0"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 md:min-h-0"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Suivant
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <ActionPlanCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clientId={clientId}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
