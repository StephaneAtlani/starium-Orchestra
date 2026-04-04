'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { AlertCircle, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import {
  defaultRisksRegistryFilters,
  RISKS_REGISTRY_HORS_PROJET,
  type RisksRegistryFiltersState,
} from './risk-filters';
import {
  RisksRegistryPagination,
  RisksRegistryTable,
  risksRegistryPageSize,
  sliceRisksRegistryPage,
} from './risks-list';
import {
  defaultSortOrderForKey,
  sortRisksRegistryRows,
  type RisksRegistrySortKey,
} from '../lib/risks-registry-table-sort';
import { RisksRegistryKpi } from './risks-registry-kpi';
import { useProjectRisksRegistryQuery, type ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createClientRisk,
  deleteClientRisk,
  getRiskTaxonomyCatalog,
  updateClientRisk,
  type CreateProjectRiskPayload,
} from '../../api/projects.api';
import { projectQueryKeys } from '../../lib/project-query-keys';
import { ProjectRiskEbiosDialog } from '../../components/project-risk-ebios-dialog';
import type { ProjectRiskApi } from '../../types/project.types';

const ALL = 'all' as const;

function applyFilters(rows: ProjectRiskRegistryRow[], f: RisksRegistryFiltersState): ProjectRiskRegistryRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.projectId === RISKS_REGISTRY_HORS_PROJET && r.projectId != null) return false;
    if (f.projectId !== ALL && f.projectId !== RISKS_REGISTRY_HORS_PROJET && r.projectId !== f.projectId)
      return false;
    if (f.status !== ALL && r.status !== f.status) return false;
    if (f.criticality !== ALL && r.criticalityLevel !== f.criticality) return false;
    if (f.ownerUserId !== ALL) {
      if (f.ownerUserId === '__unassigned__') {
        if (r.ownerUserId) return false;
      } else if (r.ownerUserId !== f.ownerUserId) {
        return false;
      }
    }
    if (f.domainId !== ALL && r.riskType?.domain?.id !== f.domainId) return false;
    if (f.riskTypeId !== ALL && r.riskTypeId !== f.riskTypeId) return false;
    if (q) {
      const inTitle = r.title.toLowerCase().includes(q);
      const inCode = r.code.toLowerCase().includes(q);
      if (!inTitle && !inCode) return false;
    }
    return true;
  });
}

function hasActiveFilters(f: RisksRegistryFiltersState): boolean {
  return (
    f.search.trim().length > 0 ||
    f.projectId !== ALL ||
    f.status !== ALL ||
    f.criticality !== ALL ||
    f.ownerUserId !== ALL ||
    f.domainId !== ALL ||
    f.riskTypeId !== ALL
  );
}

function isDefaultRegistrySort(s: { key: RisksRegistrySortKey; order: 'asc' | 'desc' }) {
  return s.key === 'criticality' && s.order === 'asc';
}

export function RisksRegistryPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canReadProjects = has('projects.read');
  const canEdit = has('projects.update');
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const taxonomyQuery = useQuery({
    queryKey: ['risk-taxonomy', 'catalog', activeClient?.id],
    queryFn: () => getRiskTaxonomyCatalog(authFetch),
    enabled: initialized && !!activeClient?.id,
    staleTime: 60_000,
  });

  const [filters, setFilters] = useState<RisksRegistryFiltersState>(() => defaultRisksRegistryFilters());
  const [sort, setSort] = useState<{ key: RisksRegistrySortKey; order: 'asc' | 'desc' }>({
    key: 'criticality',
    order: 'asc',
  });
  const [page, setPage] = useState(1);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskDialogMode, setRiskDialogMode] = useState<'create' | 'edit'>('edit');
  const [editingRisk, setEditingRisk] = useState<ProjectRiskApi | null>(null);

  const registry = useProjectRisksRegistryQuery();

  const invalidateAfterRiskChange = (data?: ProjectRiskApi) => {
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.risksRegistry(clientId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.clientRisks(clientId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.risksRegistryProjects(clientId) });
    if (data?.projectId) {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.risks(clientId, data.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, data.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'risk-detail', clientId, data.projectId],
      });
    }
    void queryClient.invalidateQueries({
      queryKey: [...projectQueryKeys.all, 'client-risk-detail', clientId],
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectRiskPayload) => createClientRisk(authFetch, payload),
    onSuccess: (data) => {
      toast.success('Risque créé');
      setEditingRisk(data);
      setRiskDialogMode('edit');
      invalidateAfterRiskChange(data);
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      riskId,
      payload,
    }: {
      riskId: string;
      payload: CreateProjectRiskPayload;
    }) => updateClientRisk(authFetch, riskId, payload),
    onSuccess: (data) => {
      setEditingRisk(data);
      invalidateAfterRiskChange(data);
    },
    onError: (e: Error) => toast.error(e.message || 'Enregistrement impossible'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ riskId }: { riskId: string }) => deleteClientRisk(authFetch, riskId),
    onSuccess: () => {
      toast.success('Risque supprimé');
      invalidateAfterRiskChange();
      setRiskDialogOpen(false);
      setEditingRisk(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const openEditRisk = (row: ProjectRiskRegistryRow) => {
    setRiskDialogMode('edit');
    setEditingRisk(row);
    setRiskDialogOpen(true);
  };

  const openCreateRisk = () => {
    setRiskDialogMode('create');
    setEditingRisk(null);
    setRiskDialogOpen(true);
  };

  const handleDialogSave = async (payload: CreateProjectRiskPayload) => {
    if (riskDialogMode === 'create') {
      await createMutation.mutateAsync(payload);
      return;
    }
    if (editingRisk) {
      await updateMutation.mutateAsync({ riskId: editingRisk.id, payload });
    }
  };

  const handleDeleteRisk = async () => {
    if (!editingRisk) return;
    await deleteMutation.mutateAsync({ riskId: editingRisk.id });
  };

  const dialogPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of registry.rows) {
      if (!r.ownerUserId) continue;
      if (!map.has(r.ownerUserId)) map.set(r.ownerUserId, r.ownerDisplayLabel);
    }
    return [...map.entries()]
      .map(([userId, label]) => ({ userId, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [registry.rows]);

  const filtered = useMemo(() => applyFilters(registry.rows, filters), [registry.rows, filters]);

  const sortedFiltered = useMemo(
    () => sortRisksRegistryRows(filtered, sort.key, sort.order),
    [filtered, sort.key, sort.order],
  );

  const ownerOptionsWithUnassigned = useMemo(() => {
    const hasUnassigned = registry.rows.some((r) => !r.ownerUserId);
    const base = [...ownerOptions];
    if (hasUnassigned) {
      return [{ userId: '__unassigned__', label: 'Non assigné' }, ...base];
    }
    return base;
  }, [registry.rows, ownerOptions]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / risksRegistryPageSize()));
  const slice = sliceRisksRegistryPage(sortedFiltered, Math.min(page, totalPages));

  const patchFilters = (patch: Partial<RisksRegistryFiltersState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const handleSort = (key: RisksRegistrySortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { key, order: defaultSortOrderForKey(key) };
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultRisksRegistryFilters());
    setSort({ key: 'criticality', order: 'asc' });
    setPage(1);
  };

  const showProjectsLoading = registry.isLoadingProjects;
  const showRisksLoading = registry.isLoadingRisks;
  const showError = registry.isError;
  const showTable =
    !showProjectsLoading && !showRisksLoading && !showError && registry.isSuccess;

  const filtersBusy = showProjectsLoading || showRisksLoading;
  const listEnabled =
    initialized && !!clientId && permsSuccess && canReadProjects;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Gestion des risques"
          description="Cockpit registre — identification, priorisation et suivi des risques pour le client actif."
          actions={
            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              {listEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  disabled={
                    filtersBusy ||
                    (!hasActiveFilters(filters) && isDefaultRegistrySort(sort))
                  }
                  data-testid="risks-filters-reset"
                >
                  Réinitialiser
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void registry.refetch()}
                disabled={filtersBusy || !listEnabled}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Actualiser
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreateRisk}
                  disabled={!listEnabled}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nouveau risque
                </Button>
              )}
            </div>
          }
        />

        {clientId && permsLoading && (
          <div data-testid="risks-perms-loading">
            <LoadingState rows={2} />
          </div>
        )}

        {clientId && permsError && !permsLoading && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>
              Impossible de charger vos permissions pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {clientId && permsSuccess && !canReadProjects && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-950 dark:text-amber-100">
              Accès au registre des risques
            </AlertTitle>
            <AlertDescription className="text-amber-950/90 dark:text-amber-100/90">
              Votre rôle n&apos;inclut pas la permission{' '}
              <code className="rounded bg-background/60 px-1.5 py-0.5 text-xs font-mono">
                projects.read
              </code>{' '}
              pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {listEnabled && (
          <>
            <RisksRegistryKpi
              rows={filtered}
              isLoading={showProjectsLoading || showRisksLoading}
            />

            {showProjectsLoading && (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardContent className="py-8" data-testid="risks-registry-loading-projects">
                  <p className="mb-3 text-sm font-medium text-foreground">Préparation du registre</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Chargement de votre périmètre de projets…
                  </p>
                  <LoadingState rows={4} />
                </CardContent>
              </Card>
            )}

            {!showProjectsLoading && showRisksLoading && (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardContent className="py-8" data-testid="risks-registry-loading-risks">
                  <p className="mb-3 text-sm font-medium text-foreground">Chargement des risques</p>
                  <p className="mb-4 text-sm text-muted-foreground">Consolidation du registre…</p>
                  <LoadingState rows={6} />
                </CardContent>
              </Card>
            )}

            {showError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Impossible de charger la gestion des risques</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {registry.error instanceof Error
                      ? registry.error.message
                      : 'Une erreur est survenue. Réessayez dans un instant.'}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void registry.refetch()}>
                    Réessayer
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {showTable && filtered.length === 0 && registry.rows.length === 0 && (
              <Card size="sm" className="overflow-hidden border-dashed border-border/80 shadow-sm">
                <CardContent className="py-10">
                  <EmptyState
                    title="Aucun risque enregistré"
                    description="Aucun risque ne figure encore dans votre registre. Créez une fiche ou vérifiez vos droits d’accès."
                    action={
                      canEdit ? (
                        <Button type="button" size="sm" onClick={openCreateRisk}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Nouveau risque
                        </Button>
                      ) : undefined
                    }
                  />
                </CardContent>
              </Card>
            )}

            {showTable && filtered.length === 0 && registry.rows.length > 0 && hasActiveFilters(filters) && (
              <Card size="sm" className="overflow-hidden border-dashed border-border/80 shadow-sm">
                <CardContent className="py-10">
                  <EmptyState
                    title="Aucun résultat pour ces filtres"
                    description="Modifiez la recherche ou réinitialisez les filtres pour élargir la sélection."
                    action={
                      <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                        Réinitialiser les filtres
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}

            {showTable && sortedFiltered.length > 0 && (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle className="text-sm font-medium">Registre des risques</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RisksRegistryTable
                    pageRows={slice.pageRows}
                    canEdit={canEdit}
                    onEditRisk={canEdit ? openEditRisk : undefined}
                    sortKey={sort.key}
                    sortOrder={sort.order}
                    onSort={handleSort}
                    filters={filters}
                    onFiltersPatch={patchFilters}
                    projectItems={registry.projectItems ?? []}
                    ownerOptions={ownerOptionsWithUnassigned}
                    taxonomyDomains={taxonomyQuery.data?.domains ?? []}
                    filtersDisabled={filtersBusy}
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between">
                  <RisksRegistryPagination
                    total={slice.total}
                    safePage={slice.safePage}
                    totalPages={slice.totalPages}
                    start={slice.start}
                    onPageChange={setPage}
                  />
                </CardFooter>
              </Card>
            )}
          </>
        )}

        <ProjectRiskEbiosDialog
          open={riskDialogOpen}
          onOpenChange={(o) => {
            setRiskDialogOpen(o);
            if (!o) setEditingRisk(null);
          }}
          mode={riskDialogMode}
          projectId={editingRisk?.projectId ?? null}
          risk={riskDialogMode === 'edit' ? editingRisk : null}
          isPending={dialogPending}
          onSave={handleDialogSave}
          canDelete={canEdit}
          onDelete={canEdit ? handleDeleteRisk : undefined}
          isDeleting={deleteMutation.isPending}
          riskApiScope="client"
          projectOptions={registry.projectItems ?? []}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
