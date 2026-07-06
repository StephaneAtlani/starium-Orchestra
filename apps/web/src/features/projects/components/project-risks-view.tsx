'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  User,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { StariumTableWrap, useStariumTablePan } from '@/components/ui/starium-table-wrap';
import {
  createProjectRisk,
  deleteProjectRisk,
  updateProjectRisk,
  type CreateProjectRiskPayload,
} from '../api/projects.api';
import { PROJECT_RISK_CRITICALITY_LABEL, RISK_STATUS_LABEL } from '../constants/project-enum-labels';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  DEFAULT_RISK_PAGE_SIZE,
  isRiskDueOverdue,
  riskCriticalityDsBadgeClass,
  riskCriticalityLabel,
  riskOwnerLabel,
  riskPiShortLabel,
  riskPiTone,
  riskPiToneClass,
  riskStatusDsBadgeClass,
  riskStatusLabel,
  riskMatchesQuickFilter,
} from '../lib/project-risk-display';
import { formatProjectDateLong } from '../lib/projects-list-display';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { ProjectRiskEbiosDialog } from './project-risk-ebios-dialog';
import { ProjectRisksActionOverview } from './project-risks-action-overview';
import { ProjectTasksPagination } from './project-tasks-pagination';
import { ProjectWorkspaceShell } from './project-workspace-shell';
import type { ProjectRiskApi } from '../types/project.types';
import type { RiskQuickFilter } from '../lib/project-risk-display';

const CRIT_KEYS = Object.keys(PROJECT_RISK_CRITICALITY_LABEL);

export function ProjectRisksView({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  useProjectDetailQuery(projectId);
  const risksQuery = useProjectRisksQuery(projectId);
  const assignableQuery = useProjectAssignableUsers({ enabled: canEdit });

  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskDialogMode, setRiskDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRisk, setEditingRisk] = useState<ProjectRiskApi | null>(null);
  const [quickFilter, setQuickFilter] = useState<RiskQuickFilter>('all');

  const invalidateRisks = () => {
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.risks(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.detail(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: [...projectQueryKeys.all, 'risk-detail', clientId, projectId],
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.risksRegistry(clientId),
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectRiskPayload) =>
      createProjectRisk(authFetch, projectId, payload),
    onSuccess: (data) => {
      toast.success('Risque créé');
      setEditingRisk(data);
      setRiskDialogMode('edit');
      invalidateRisks();
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
    }) => updateProjectRisk(authFetch, projectId, riskId, payload),
    onSuccess: (data) => {
      setEditingRisk(data);
      invalidateRisks();
    },
    onError: (e: Error) => toast.error(e.message || 'Enregistrement impossible'),
  });

  const deleteMutation = useMutation({
    mutationFn: (riskId: string) => deleteProjectRisk(authFetch, projectId, riskId),
    onSuccess: () => {
      toast.success('Risque supprimé');
      invalidateRisks();
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const openCreateDialog = () => {
    setEditingRisk(null);
    setRiskDialogMode('create');
    setRiskDialogOpen(true);
  };

  const openEditDialog = (risk: ProjectRiskApi) => {
    setEditingRisk(risk);
    setRiskDialogMode('edit');
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
    await deleteMutation.mutateAsync(editingRisk.id);
    setRiskDialogOpen(false);
    setEditingRisk(null);
  };

  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  if (!initialized) {
    return <LoadingState rows={4} />;
  }

  if (!clientId) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/5">
        <AlertTitle>Client actif requis</AlertTitle>
        <AlertDescription>
          Sélectionnez une organisation (client) dans l’en-tête pour charger les risques du projet.
        </AlertDescription>
      </Alert>
    );
  }

  const dialogPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const risks = risksQuery.data ?? [];

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <div className="starium-proj-risks">
        {risksQuery.isError ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Impossible de charger les risques</AlertTitle>
            <AlertDescription>
              {risksQuery.error instanceof Error
                ? risksQuery.error.message
                : 'Erreur réseau ou accès refusé.'}
            </AlertDescription>
          </Alert>
        ) : risksQuery.isLoading || risksQuery.isPending ? (
          <LoadingState rows={6} />
        ) : (
          <>
            <ProjectRisksActionOverview
              risks={risks}
              quickFilter={quickFilter}
              onQuickFilter={setQuickFilter}
              onSelectRisk={canEdit ? openEditDialog : undefined}
            />

            <ProjectRisksListSection
              risks={risks}
              canEdit={canEdit}
              onEdit={openEditDialog}
              onCreate={openCreateDialog}
              quickFilter={quickFilter}
              onQuickFilterChange={setQuickFilter}
              ownerById={
                new Map(
                  (assignableQuery.data?.users ?? []).map((u) => [
                    u.id,
                    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
                  ]),
                )
              }
            />
          </>
        )}
      </div>

      <ProjectRiskEbiosDialog
        open={riskDialogOpen}
        onOpenChange={(o) => {
          setRiskDialogOpen(o);
          if (!o) setEditingRisk(null);
        }}
        mode={riskDialogMode}
        projectId={projectId}
        risk={riskDialogMode === 'edit' ? editingRisk : null}
        isPending={dialogPending}
        onSave={handleDialogSave}
        canDelete={canEdit}
        onDelete={handleDeleteRisk}
        isDeleting={deleteMutation.isPending}
      />
    </ProjectWorkspaceShell>
  );
}

function ProjectRisksListSection({
  risks,
  canEdit,
  onEdit,
  onCreate,
  ownerById,
  quickFilter,
  onQuickFilterChange,
}: {
  risks: ProjectRiskApi[];
  canEdit: boolean;
  onEdit: (risk: ProjectRiskApi) => void;
  onCreate: () => void;
  ownerById: Map<string, string>;
  quickFilter: RiskQuickFilter;
  onQuickFilterChange: (filter: RiskQuickFilter) => void;
}) {
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_RISK_PAGE_SIZE);

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const risk of risks) {
      if (!risk.ownerUserId) continue;
      map.set(risk.ownerUserId, riskOwnerLabel(risk, ownerById));
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [risks, ownerById]);

  const filteredRisks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return risks.filter((risk) => {
      if (q) {
        const haystack = [risk.code, risk.title, risk.description, risk.fearedEvent]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (criticalityFilter !== 'all' && risk.criticalityLevel !== criticalityFilter) {
        return false;
      }
      if (statusFilter !== 'all' && risk.status !== statusFilter) return false;
      if (ownerFilter !== 'all') {
        if (ownerFilter === '__none__') {
          if (risk.ownerUserId) return false;
        } else if (risk.ownerUserId !== ownerFilter) {
          return false;
        }
      }
      if (!riskMatchesQuickFilter(risk, quickFilter)) return false;
      return true;
    });
  }, [risks, search, criticalityFilter, statusFilter, ownerFilter, quickFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRisks.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRisks = useMemo(() => {
    const offset = (safePage - 1) * pageSize;
    return filteredRisks.slice(offset, offset + pageSize);
  }, [filteredRisks, safePage, pageSize]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    criticalityFilter !== 'all' ||
    statusFilter !== 'all' ||
    ownerFilter !== 'all' ||
    quickFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setCriticalityFilter('all');
    setStatusFilter('all');
    setOwnerFilter('all');
    onQuickFilterChange('all');
    setPage(1);
  };

  return (
    <>
      <div className="starium-toolbar" role="search">
        <label className="starium-search-input">
          <Search strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              onQuickFilterChange('all');
              setPage(1);
            }}
            placeholder="Rechercher un risque…"
            aria-label="Rechercher un risque"
          />
        </label>

        <div className="starium-fbtn-wrap">
          <AlertTriangle className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
          <select
            className="starium-fbtn-select"
            value={criticalityFilter}
            onChange={(event) => {
              setCriticalityFilter(event.target.value);
              onQuickFilterChange('all');
              setPage(1);
            }}
            aria-label="Filtrer par niveau"
          >
            <option value="all">Niveau</option>
            {CRIT_KEYS.map((key) => (
              <option key={key} value={key}>
                {PROJECT_RISK_CRITICALITY_LABEL[key]}
              </option>
            ))}
          </select>
          <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
        </div>

        <div className="starium-fbtn-wrap">
          <select
            className="starium-fbtn-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              onQuickFilterChange('all');
              setPage(1);
            }}
            aria-label="Filtrer par statut"
          >
            <option value="all">Statut</option>
            {Object.keys(RISK_STATUS_LABEL).map((key) => (
              <option key={key} value={key}>
                {RISK_STATUS_LABEL[key]}
              </option>
            ))}
          </select>
          <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
        </div>

        <div className="starium-fbtn-wrap">
          <User className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
          <select
            className="starium-fbtn-select"
            value={ownerFilter}
            onChange={(event) => {
              setOwnerFilter(event.target.value);
              onQuickFilterChange('all');
              setPage(1);
            }}
            aria-label="Filtrer par propriétaire"
          >
            <option value="all">Propriétaire</option>
            <option value="__none__">Non assigné</option>
            {ownerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
        </div>

        <button
          type="button"
          className={cn('starium-fbtn', !hasActiveFilters && 'starium-fbtn--muted')}
          onClick={resetFilters}
          disabled={!hasActiveFilters}
        >
          <RotateCcw strokeWidth={2} aria-hidden />
          Réinitialiser
        </button>

        <div className="starium-toolbar-spacer" aria-hidden />

        {canEdit ? (
          <button type="button" className="starium-btn starium-btn-primary" onClick={onCreate}>
            <Plus strokeWidth={2.5} aria-hidden />
            Nouveau risque
          </button>
        ) : null}
      </div>

      <div className="starium-tablecard">
        <StariumTableWrap scrollLabel="Liste des risques — glisser pour faire défiler">
          <table className="starium-dt starium-dt--wide">
            <caption className="sr-only">Registre des risques du projet</caption>
            <thead>
              <tr>
                <th scope="col">Risque</th>
                <th scope="col">Niveau</th>
                <th scope="col">Probabilité</th>
                <th scope="col">Impact</th>
                <th scope="col">Propriétaire</th>
                <th scope="col">Échéance</th>
                <th scope="col">Plan d&apos;action</th>
                <th scope="col">Statut</th>
                <th scope="col" className="starium-dt__right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRisks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    {risks.length === 0
                      ? 'Aucun risque enregistré pour ce projet.'
                      : 'Aucun risque ne correspond aux filtres.'}
                  </td>
                </tr>
              ) : (
                paginatedRisks.map((risk, index) => (
                  <RiskTableRow
                    key={risk.id}
                    risk={risk}
                    index={(safePage - 1) * pageSize + index}
                    canEdit={canEdit}
                    ownerById={ownerById}
                    onEdit={onEdit}
                  />
                ))
              )}
            </tbody>
          </table>
        </StariumTableWrap>

        <ProjectTasksPagination
          total={filteredRisks.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          entityLabel="risques"
        />
      </div>
    </>
  );
}

function RiskTableRow({
  risk,
  index,
  canEdit,
  ownerById,
  onEdit,
}: {
  risk: ProjectRiskApi;
  index: number;
  canEdit: boolean;
  ownerById: Map<string, string>;
  onEdit: (risk: ProjectRiskApi) => void;
}) {
  const { shouldSuppressClick } = useStariumTablePan();
  const owner = riskOwnerLabel(risk, ownerById);
  const subtitle = risk.description?.trim() || risk.fearedEvent?.trim() || risk.code;
  const overdue = risk.status !== 'CLOSED' && isRiskDueOverdue(risk.dueDate);
  const actionPlan = risk.mitigationPlan?.trim() || risk.complementaryTreatmentMeasures?.trim();

  return (
    <tr
      className={cn(canEdit && 'cursor-pointer')}
      onClick={() => {
        if (shouldSuppressClick()) return;
        if (canEdit) onEdit(risk);
      }}
      onKeyDown={(event) => {
        if (!canEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit(risk);
        }
      }}
      tabIndex={canEdit ? 0 : undefined}
    >
      <td>
        <div className="min-w-[12rem] max-w-[20rem]">
          <div className="starium-dt-cell-strong">{risk.title}</div>
          <div className="starium-dt-cell-sub line-clamp-2">{subtitle}</div>
        </div>
      </td>
      <td>
        <span className={cn('starium-ds-badge', riskCriticalityDsBadgeClass(risk.criticalityLevel))}>
          {riskCriticalityLabel(risk.criticalityLevel)}
        </span>
      </td>
      <td className={riskPiToneClass(riskPiTone(risk.probability))}>
        {riskPiShortLabel(risk.probability)}
      </td>
      <td className={riskPiToneClass(riskPiTone(risk.impact))}>{riskPiShortLabel(risk.impact)}</td>
      <td>
        {owner !== '—' ? (
          <div className="starium-dt-assignee">
            <UserInitialsAvatar
              displayName={owner}
              seed={risk.ownerUserId ?? risk.id}
              themeIndex={index}
              size="sm"
            />
            <span className="starium-dt-assignee-name">{owner}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td>
        <div className={cn('starium-dt-date', overdue && 'starium-dt-date--late')}>
          <Calendar strokeWidth={1.75} aria-hidden />
          {formatProjectDateLong(risk.dueDate)}
        </div>
      </td>
      <td className="max-w-[14rem] text-[12.5px] text-[color:var(--neutral-600)]">
        {actionPlan ? (
          <span className="line-clamp-2" title={actionPlan}>
            {actionPlan}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td>
        <span className={cn('starium-ds-badge', riskStatusDsBadgeClass(risk.status))}>
          {riskStatusLabel(risk.status)}
        </span>
      </td>
      <td className="text-right">
        {canEdit ? (
          <button
            type="button"
            className="starium-dt-dots-btn"
            aria-label={`Actions pour ${risk.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(risk);
            }}
          >
            <MoreHorizontal aria-hidden />
          </button>
        ) : null}
      </td>
    </tr>
  );
}
