'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  GOVERNANCE_CYCLE_CADENCE_OPTIONS,
  GOVERNANCE_CYCLE_STATUS_OPTIONS,
  getGovernanceCycleCadenceLabel,
} from '../lib/governance-cycle-labels';
import {
  formatGovernanceCapacityDays,
  formatGovernanceCycleDateRange,
  formatGovernanceCycleDateTime,
  formatGovernanceDecimalAmount,
} from '../lib/governance-cycle-formatters';
import type {
  GovernanceCycleGlobalSummaryDto,
  GovernanceCycleResponseDto,
  GovernanceCycleStatus,
} from '../types/governance-cycle.types';
import {
  getApiErrorMessage,
  useArchiveGovernanceCycleMutation,
  useGovernanceCycleSummariesForIdsQuery,
  useGovernanceCyclesListQuery,
} from '../hooks/use-governance-cycles';
import { GovernanceCycleFormDialog } from './governance-cycle-form-dialog';
import { GovernanceCycleStatusBadge } from './governance-cycle-status-badge';

const PAGE_SIZE = 20;

function computePageSummary(cycles: GovernanceCycleResponseDto[]) {
  return {
    active: cycles.filter((c) => c.status !== 'CLOSED' && c.status !== 'ARCHIVED').length,
    toArbitrate: cycles.filter((c) => c.status === 'TO_ARBITRATE').length,
    inExecution: cycles.filter((c) => c.status === 'IN_EXECUTION').length,
    closed: cycles.filter((c) => c.status === 'CLOSED').length,
  };
}

function matchesPeriodFilter(
  cycle: GovernanceCycleResponseDto,
  periodStart: string,
  periodEnd: string,
): boolean {
  if (!periodStart && !periodEnd) return true;
  const start = cycle.startDate ? new Date(cycle.startDate).getTime() : null;
  const end = cycle.endDate ? new Date(cycle.endDate).getTime() : null;
  const filterStart = periodStart ? new Date(periodStart).getTime() : null;
  const filterEnd = periodEnd ? new Date(periodEnd).getTime() : null;
  if (filterStart != null && end != null && end < filterStart) return false;
  if (filterEnd != null && start != null && start > filterEnd) return false;
  return true;
}

export function GovernanceCyclesPage() {
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('governance_cycles.read');
  const listEnabled = permsSuccess && canRead;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cadenceFilter, setCadenceFilter] = useState<string>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<GovernanceCycleResponseDto | null>(null);

  const listParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter !== 'all' ? (statusFilter as GovernanceCycleStatus) : undefined,
      cadence:
        cadenceFilter !== 'all'
          ? (cadenceFilter as GovernanceCycleResponseDto['cadence'])
          : undefined,
      includeArchived: includeArchived || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [search, statusFilter, cadenceFilter, includeArchived, offset],
  );

  const listQuery = useGovernanceCyclesListQuery(listParams, { enabled: listEnabled });
  const archiveMutation = useArchiveGovernanceCycleMutation();

  const serverItems = listQuery.data?.items ?? [];
  const visibleItems = useMemo(
    () => serverItems.filter((c) => matchesPeriodFilter(c, periodStart, periodEnd)),
    [serverItems, periodStart, periodEnd],
  );
  const visibleIds = visibleItems.map((c) => c.id);
  const summaryQueries = useGovernanceCycleSummariesForIdsQuery(visibleIds, {
    enabled: listEnabled && visibleIds.length > 0,
  });

  const summaryByCycleId = useMemo(() => {
    const map = new Map<string, GovernanceCycleGlobalSummaryDto>();
    visibleIds.forEach((id, index) => {
      const data = summaryQueries[index]?.data;
      if (data) map.set(id, data);
    });
    return map;
  }, [visibleIds, summaryQueries]);

  const pageSummary = computePageSummary(visibleItems);

  async function handleArchive(cycle: GovernanceCycleResponseDto) {
    if (!window.confirm(`Archiver le cycle « ${cycle.name} » ?`)) return;
    try {
      await archiveMutation.mutateAsync(cycle.id);
      toast.success('Cycle archivé');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const cycleColumns = useMemo<DataTableColumn<GovernanceCycleResponseDto>[]>(() => {
    return [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (cycle) => (
          <div>
            <div className="font-medium">
              <Link href={`/cycles/${cycle.id}`} className="hover:underline">
                {cycle.name}
              </Link>
            </div>
            {cycle.code ? (
              <div className="text-xs text-muted-foreground">{cycle.code}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'cadence',
        header: 'Cadence',
        mobilePriority: 'secondary',
        cell: (cycle) => getGovernanceCycleCadenceLabel(cycle.cadence),
      },
      {
        key: 'period',
        header: 'Période',
        mobilePriority: 'secondary',
        cell: (cycle) => (
          <span className="whitespace-nowrap text-sm">
            {formatGovernanceCycleDateRange(cycle.startDate, cycle.endDate)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (cycle) => <GovernanceCycleStatusBadge status={cycle.status} />,
      },
      {
        key: 'items',
        header: 'Items',
        className: 'text-right tabular-nums',
        mobilePriority: 'secondary',
        cell: (cycle) => cycle.summary.itemsCount,
      },
      {
        key: 'toArbitrate',
        header: 'À arbitrer',
        className: 'text-right tabular-nums',
        mobilePriority: 'secondary',
        cell: (cycle) => {
          const summary = summaryByCycleId.get(cycle.id);
          const summaryFailed = summaryQueries[visibleIds.indexOf(cycle.id)]?.isError;
          return summaryFailed || !summary ? '—' : summary.toArbitrateCount;
        },
      },
      {
        key: 'budget',
        header: 'Budget est.',
        className: 'text-right tabular-nums',
        mobilePriority: 'secondary',
        cell: (cycle) => {
          const summary = summaryByCycleId.get(cycle.id);
          const summaryFailed = summaryQueries[visibleIds.indexOf(cycle.id)]?.isError;
          return summaryFailed || !summary
            ? '—'
            : formatGovernanceDecimalAmount(summary.estimatedBudgetTotal);
        },
      },
      {
        key: 'capacity',
        header: 'Capacité est.',
        className: 'text-right tabular-nums',
        mobilePriority: 'secondary',
        cell: (cycle) => {
          const summary = summaryByCycleId.get(cycle.id);
          const summaryFailed = summaryQueries[visibleIds.indexOf(cycle.id)]?.isError;
          return summaryFailed || !summary
            ? '—'
            : formatGovernanceCapacityDays(summary.estimatedCapacityDaysTotal);
        },
      },
      {
        key: 'updatedAt',
        header: 'Dernière MAJ',
        mobilePriority: 'hidden-mobile',
        cell: (cycle) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatGovernanceCycleDateTime(cycle.updatedAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (cycle) => (
          <div className="flex flex-wrap justify-end gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/cycles/${cycle.id}`}>Ouvrir</Link>
            </Button>
            <PermissionGate permission="governance_cycles.update">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Modifier"
                onClick={() => setEditCycle(cycle)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </PermissionGate>
            <PermissionGate permission="governance_cycles.delete">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Archiver"
                onClick={() => handleArchive(cycle)}
                disabled={archiveMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
        ),
      },
    ];
  }, [archiveMutation.isPending, summaryByCycleId, summaryQueries, visibleIds]);

  if (!canRead && permsSuccess) {
    return (
      <PageContainer>
        <Alert>
          <AlertDescription>
            Permission <code className="text-xs">governance_cycles.read</code> requise.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const total = listQuery.data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Cycles de pilotage"
        description="Arbitrage CODIR et priorisation transverse."
        actions={
          <PermissionGate permission="governance_cycles.create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau cycle
            </Button>
          </PermissionGate>
        }
      />

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Synthèse de la page affichée</h2>
          <p className="text-xs text-muted-foreground">Calculée sur les cycles visibles.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Cycles actifs', value: pageSummary.active },
            { label: 'À arbitrer', value: pageSummary.toArbitrate },
            { label: 'En exécution', value: pageSummary.inExecution },
            { label: 'Clôturés', value: pageSummary.closed },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FilterBar
        aria-label="Filtres cycles de pilotage"
        asSearch
        desktopColumns={4}
        className="space-y-0"
      >
        <FilterBarField id="cycles-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              placeholder="Nom ou code…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full"
            />
          )}
        </FilterBarField>
        <FilterBarField id="cycles-status" label="Statut">
          {({ controlId, labelId }) => (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? 'all');
                setOffset(0);
              }}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {GOVERNANCE_CYCLE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="cycles-cadence" label="Cadence">
          {({ controlId, labelId }) => (
            <Select
              value={cadenceFilter}
              onValueChange={(v) => {
                setCadenceFilter(v ?? 'all');
                setOffset(0);
              }}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {GOVERNANCE_CYCLE_CADENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="cycles-archived" label="Inclure archivés">
          {({ controlId, labelId }) => (
            <Select
              value={includeArchived ? 'yes' : 'no'}
              onValueChange={(v) => {
                setIncludeArchived(v === 'yes');
                setOffset(0);
              }}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Non</SelectItem>
                <SelectItem value="yes">Oui</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField
          id="period-start"
          label="Période — page affichée (début)"
          description="Filtre local sur les cycles déjà chargés sur cette page."
        >
          {({ controlId, descriptionId }) => (
            <Input
              id={controlId}
              type="date"
              aria-describedby={descriptionId}
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full"
            />
          )}
        </FilterBarField>
        <FilterBarField id="period-end" label="Période — page affichée (fin)">
          {({ controlId }) => (
            <Input
              id={controlId}
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full"
            />
          )}
        </FilterBarField>
      </FilterBar>

      {listQuery.isLoading ? (
        <LoadingState rows={6} />
      ) : listQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(listQuery.error, 'Impossible de charger les cycles.')}
          </AlertDescription>
        </Alert>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="Aucun cycle"
          description="Créez un cycle de pilotage ou ajustez les filtres."
        />
      ) : (
        <>
          <DataTable
            columns={cycleColumns}
            data={visibleItems}
            getRowId={(cycle) => cycle.id}
            mobileCardsAriaLabel="Liste des cycles de pilotage"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {total} cycle{total > 1 ? 's' : ''} au total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <GovernanceCycleFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      {editCycle ? (
        <GovernanceCycleFormDialog
          open={Boolean(editCycle)}
          onOpenChange={(open) => {
            if (!open) setEditCycle(null);
          }}
          mode="edit"
          cycle={editCycle}
          onSuccess={() => setEditCycle(null)}
        />
      ) : null}
    </PageContainer>
  );
}
