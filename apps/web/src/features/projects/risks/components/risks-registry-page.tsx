'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import {
  defaultRisksRegistryFilters,
  RiskFilters,
  type RisksRegistryFiltersState,
} from './risk-filters';
import { RisksList, risksRegistryPageSize } from './risks-list';
import { useProjectRisksRegistryQuery, type ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import { NewRiskRedirectDialog } from './new-risk-redirect-dialog';

const ALL = 'all' as const;

function applyFilters(rows: ProjectRiskRegistryRow[], f: RisksRegistryFiltersState): ProjectRiskRegistryRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.projectId !== ALL && r.projectId !== f.projectId) return false;
    if (f.status !== ALL && r.status !== f.status) return false;
    if (f.criticality !== ALL && r.criticalityLevel !== f.criticality) return false;
    if (f.ownerUserId !== ALL) {
      if (f.ownerUserId === '__unassigned__') {
        if (r.ownerUserId) return false;
      } else if (r.ownerUserId !== f.ownerUserId) {
        return false;
      }
    }
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
    f.ownerUserId !== ALL
  );
}

export function RisksRegistryPage() {
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const [filters, setFilters] = useState<RisksRegistryFiltersState>(defaultRisksRegistryFilters);
  const [page, setPage] = useState(1);
  const [newRiskOpen, setNewRiskOpen] = useState(false);

  const registry = useProjectRisksRegistryQuery();

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

  const ownerOptionsWithUnassigned = useMemo(() => {
    const hasUnassigned = registry.rows.some((r) => !r.ownerUserId);
    const base = [...ownerOptions];
    if (hasUnassigned) {
      return [{ userId: '__unassigned__', label: 'Non assigné' }, ...base];
    }
    return base;
  }, [registry.rows, ownerOptions]);

  const pageSize = risksRegistryPageSize();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const handleFiltersChange = (next: RisksRegistryFiltersState) => {
    setFilters(next);
    setPage(1);
  };

  const showProjectsLoading = registry.isLoadingProjects;
  const showRisksLoading = registry.isLoadingRisks;
  const showError = registry.isError;
  const showTable =
    !showProjectsLoading && !showRisksLoading && !showError && registry.isSuccess;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Gestion des risques"
        description="Registre transverse des risques projets — vue cockpit pour le pilotage."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void registry.refetch()}
              disabled={showProjectsLoading || showRisksLoading}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Actualiser
            </Button>
            {canEdit && (
              <Button type="button" size="sm" onClick={() => setNewRiskOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nouveau risque
              </Button>
            )}
          </div>
        }
      />

      <RiskFilters
        value={filters}
        onChange={handleFiltersChange}
        projectItems={registry.projectItems ?? []}
        ownerOptions={ownerOptionsWithUnassigned}
        disabled={showProjectsLoading || showRisksLoading}
      />

      {showProjectsLoading && (
        <div className="space-y-2 py-2" data-testid="risks-registry-loading-projects">
          <p className="text-sm font-medium text-foreground">Chargement des projets</p>
          <p className="text-sm text-muted-foreground">
            Récupération de la liste des projets accessibles (pagination complète)…
          </p>
          <LoadingState rows={4} />
        </div>
      )}

      {!showProjectsLoading && showRisksLoading && (
        <div className="space-y-2 py-2" data-testid="risks-registry-loading-risks">
          <p className="text-sm font-medium text-foreground">Chargement des risques</p>
          <p className="text-sm text-muted-foreground">
            Agrégation des risques par projet (requêtes parallèles limitées)…
          </p>
          <LoadingState rows={6} />
        </div>
      )}

      {showError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Impossible de charger le registre</AlertTitle>
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
        <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Aucun risque enregistré</p>
          <p className="mt-2">
            Aucun risque n’a été trouvé sur les projets accessibles. Créez un risque depuis le registre
            d’un projet ou vérifiez les droits d’accès.
          </p>
        </div>
      )}

      {showTable && filtered.length === 0 && registry.rows.length > 0 && hasActiveFilters(filters) && (
        <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Aucun résultat pour ces filtres</p>
          <p className="mt-2">Modifiez la recherche ou réinitialisez les filtres pour élargir la sélection.</p>
          <Button type="button" variant="link" className="mt-3" onClick={() => handleFiltersChange(defaultRisksRegistryFilters())}>
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {showTable && filtered.length > 0 && (
        <RisksList
          rows={filtered}
          page={Math.min(page, totalPages)}
          onPageChange={setPage}
        />
      )}

      <NewRiskRedirectDialog
        open={newRiskOpen}
        onOpenChange={setNewRiskOpen}
        projectItems={registry.projectItems ?? []}
      />
    </div>
  );
}
