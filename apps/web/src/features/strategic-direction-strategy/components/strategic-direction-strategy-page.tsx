'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTablePan } from '@/hooks/use-table-pan';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import {
  useArchiveStrategicDirectionStrategyMutation,
  useCreateStrategicDirectionStrategyMutation,
  useReplaceStrategicDirectionStrategyAxesMutation,
  useReplaceStrategicDirectionStrategyObjectivesMutation,
  useReviewStrategicDirectionStrategyMutation,
  useStrategicDirectionOptionsQuery,
  useStrategicDirectionStrategiesQuery,
  useStrategicDirectionStrategyDetailQuery,
  useStrategicDirectionStrategyLinksQuery,
  useStrategicVisionOptionsQuery,
  useSubmitStrategicDirectionStrategyMutation,
  useUpdateStrategicDirectionStrategyMutation,
} from '../hooks/use-strategic-direction-strategy-queries';
import type { StrategicDirectionStrategyDto } from '../types/strategic-direction-strategy.types';
import {
  useStrategicAxesFallbackQuery,
  useStrategicObjectivesQuery,
} from '@/features/strategic-vision/hooks/use-strategic-vision-queries';
import {
  STRATEGIC_AXIS_ICONS,
  strategicAxisIconColorClass,
} from '@/features/strategic-vision/components/strategic-axis-icons';
import { splitAxisLogoAndTitle } from '@/features/strategic-vision/lib/strategic-vision-tabs-view';
import { StrategicDirectionCreateEditDialog } from '@/features/strategic-vision/components/strategic-direction-create-edit-dialog';
import { HumanResourceCombobox } from '@/features/teams/work-teams/components/human-resource-combobox';
import { humanResourceLeadLabel } from '@/features/teams/work-teams/components/work-team-lead-combobox';

function rowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type PriorityRow = { id: string; title: string; description: string };
type OutcomeRow = { id: string; label: string; target: string };
type KpiRow = { id: string; name: string; target: string; unit: string };
type InitiativeRow = { id: string; title: string; description: string };
type RiskRow = { id: string; label: string; mitigation: string };

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  ON_TRACK: 'Dans les clous',
  AT_RISK: 'À risque',
  OFF_TRACK: 'Hors trajectoire',
  COMPLETED: 'Atteint',
  ARCHIVED: 'Archivé',
};

function objectiveStatusLabel(status: string): string {
  return OBJECTIVE_STATUS_LABELS[status] ?? status;
}

function sectionShellClass(): string {
  return 'space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4';
}

function emptyPriority(): PriorityRow {
  return { id: rowId(), title: '', description: '' };
}
function emptyOutcome(): OutcomeRow {
  return { id: rowId(), label: '', target: '' };
}
function emptyKpi(): KpiRow {
  return { id: rowId(), name: '', target: '', unit: '' };
}
function emptyInitiative(): InitiativeRow {
  return { id: rowId(), title: '', description: '' };
}
function emptyRisk(): RiskRow {
  return { id: rowId(), label: '', mitigation: '' };
}

function prioritiesFromApi(raw: unknown): PriorityRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyPriority()];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      id: rowId(),
      title: typeof o.title === 'string' ? o.title : '',
      description: typeof o.description === 'string' ? o.description : '',
    };
  });
}

function outcomesFromApi(raw: unknown): OutcomeRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyOutcome()];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      id: rowId(),
      label: typeof o.label === 'string' ? o.label : '',
      target: typeof o.target === 'string' ? o.target : '',
    };
  });
}

function kpisFromApi(raw: unknown): KpiRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyKpi()];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      id: rowId(),
      name: typeof o.name === 'string' ? o.name : '',
      target: typeof o.target === 'string' ? o.target : '',
      unit: typeof o.unit === 'string' ? o.unit : '',
    };
  });
}

function initiativesFromApi(raw: unknown): InitiativeRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyInitiative()];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      id: rowId(),
      title: typeof o.title === 'string' ? o.title : '',
      description: typeof o.description === 'string' ? o.description : '',
    };
  });
}

function risksFromApi(raw: unknown): RiskRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyRisk()];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      id: rowId(),
      label: typeof o.label === 'string' ? o.label : '',
      mitigation: typeof o.mitigation === 'string' ? o.mitigation : '',
    };
  });
}

function toStrategicPrioritiesPayload(rows: PriorityRow[]): Array<Record<string, unknown>> {
  return rows
    .filter((r) => r.title.trim())
    .map((r, order) => ({
      title: r.title.trim(),
      ...(r.description.trim() ? { description: r.description.trim() } : {}),
      order,
    }));
}

function toExpectedOutcomesPayload(rows: OutcomeRow[]): Array<Record<string, unknown>> {
  return rows
    .filter((r) => r.label.trim())
    .map((r, order) => ({
      label: r.label.trim(),
      ...(r.target.trim() ? { target: r.target.trim() } : {}),
      order,
    }));
}

function toKpisPayload(rows: KpiRow[]): Array<Record<string, unknown>> {
  return rows
    .filter((r) => r.name.trim())
    .map((r, order) => ({
      name: r.name.trim(),
      ...(r.target.trim() ? { target: r.target.trim() } : {}),
      ...(r.unit.trim() ? { unit: r.unit.trim() } : {}),
      order,
    }));
}

function toMajorInitiativesPayload(rows: InitiativeRow[]): Array<Record<string, unknown>> {
  return rows
    .filter((r) => r.title.trim())
    .map((r, order) => ({
      title: r.title.trim(),
      ...(r.description.trim() ? { description: r.description.trim() } : {}),
      order,
    }));
}

function toRisksPayload(rows: RiskRow[]): Array<Record<string, unknown>> {
  return rows
    .filter((r) => r.label.trim())
    .map((r, order) => ({
      label: r.label.trim(),
      ...(r.mitigation.trim() ? { mitigation: r.mitigation.trim() } : {}),
      order,
    }));
}

export function StrategicDirectionStrategyPage() {
  const { has } = usePermissions();
  const canRead = has('strategic_direction_strategy.read');
  const canCreate = has('strategic_direction_strategy.create');
  const canUpdate = has('strategic_direction_strategy.update');
  const canReview = has('strategic_direction_strategy.review');
  const canManageDirections = has('strategic_vision.update') || has('strategic_vision.manage_directions');

  const [filterDirectionId, setFilterDirectionId] = useState<string>('');
  const [filterVisionId, setFilterVisionId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<
    'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | ''
  >('');
  const [filterIncludeArchived, setFilterIncludeArchived] = useState(false);
  const [search, setSearch] = useState<string>('');

  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [directionId, setDirectionId] = useState<string>('');
  const [alignedVisionId, setAlignedVisionId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [ambition, setAmbition] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [horizonLabel, setHorizonLabel] = useState<string>('');
  const [ownerLabel, setOwnerLabel] = useState<string>('');
  const [priorityRows, setPriorityRows] = useState<PriorityRow[]>([emptyPriority()]);
  const [outcomeRows, setOutcomeRows] = useState<OutcomeRow[]>([emptyOutcome()]);
  const [kpiRows, setKpiRows] = useState<KpiRow[]>([emptyKpi()]);
  const [initiativeRows, setInitiativeRows] = useState<InitiativeRow[]>([emptyInitiative()]);
  const [riskRows, setRiskRows] = useState<RiskRow[]>([emptyRisk()]);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [adaptationReason, setAdaptationReason] = useState('');
  const [adaptationDialogOpen, setAdaptationDialogOpen] = useState(false);
  const [adaptationEditEnabled, setAdaptationEditEnabled] = useState(false);
  const [createDirectionOpen, setCreateDirectionOpen] = useState(false);
  const [ownerResourceId, setOwnerResourceId] = useState<string>('');
  const [selectedAxisIds, setSelectedAxisIds] = useState<string[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);

  const directionsQ = useStrategicDirectionOptionsQuery({ enabled: canRead });
  const visionsQ = useStrategicVisionOptionsQuery({ enabled: canRead });
  const strategiesQ = useStrategicDirectionStrategiesQuery(
    {
      directionId: filterDirectionId || null,
      alignedVisionId: filterVisionId || null,
      status: filterStatus || null,
      search: search || null,
      includeArchived:
        filterIncludeArchived || filterStatus === 'ARCHIVED' ? true : undefined,
    },
    { enabled: canRead },
  );

  const strategyInList = useMemo(
    () => (strategiesQ.data ?? []).find((s) => s.id === selectedStrategyId) ?? null,
    [strategiesQ.data, selectedStrategyId],
  );

  const fetchDetail =
    Boolean(selectedStrategyId) && !isCreating && !strategyInList && canRead;
  const detailQ = useStrategicDirectionStrategyDetailQuery(selectedStrategyId, {
    enabled: fetchDetail,
  });

  const linksQ = useStrategicDirectionStrategyLinksQuery(selectedStrategyId, {
    enabled: Boolean(canRead && selectedStrategyId && !isCreating),
  });

  const axesQ = useStrategicAxesFallbackQuery({
    enabled: Boolean(canRead && alignedVisionId),
  });

  const objectivesQ = useStrategicObjectivesQuery({
    enabled: Boolean(canRead && alignedVisionId),
  });

  const selectedStrategy: StrategicDirectionStrategyDto | null = isCreating
    ? null
    : strategyInList ?? detailQ.data ?? null;

  const directionById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const d of directionsQ.data ?? []) map.set(d.id, d);
    return map;
  }, [directionsQ.data]);

  const visionById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; horizonLabel: string }>();
    for (const v of visionsQ.data ?? []) map.set(v.id, v);
    return map;
  }, [visionsQ.data]);

  const directionLabel = (strategy: StrategicDirectionStrategyDto) => {
    const rel = strategy.direction;
    if (rel?.name) return `${rel.name} (${rel.code})`;
    const d = directionById.get(strategy.directionId);
    if (d) return `${d.name} (${d.code})`;
    return '—';
  };

  const visionTitleCell = (strategy: StrategicDirectionStrategyDto) => {
    const rel = strategy.alignedVision;
    if (rel?.title) return rel.title;
    const v = visionById.get(strategy.alignedVisionId);
    return v?.title ?? '—';
  };

  const createMutation = useCreateStrategicDirectionStrategyMutation();
  const updateMutation = useUpdateStrategicDirectionStrategyMutation();
  const submitMutation = useSubmitStrategicDirectionStrategyMutation();
  const reviewMutation = useReviewStrategicDirectionStrategyMutation();
  const archiveMutation = useArchiveStrategicDirectionStrategyMutation();
  const replaceAxesMutation = useReplaceStrategicDirectionStrategyAxesMutation();
  const replaceObjectivesMutation = useReplaceStrategicDirectionStrategyObjectivesMutation();

  const tablePan = useTablePan();

  const resetListFilters = useCallback(() => {
    setFilterDirectionId('');
    setFilterVisionId('');
    setFilterStatus('');
    setFilterIncludeArchived(false);
    setSearch('');
  }, []);

  const status = selectedStrategy?.status ?? 'DRAFT';
  const approvedAdaptationMode =
    Boolean(selectedStrategy && selectedStrategy.status === 'APPROVED') && adaptationEditEnabled;
  const canEditFields =
    (isCreating && canCreate) ||
    (!!selectedStrategy &&
      canUpdate &&
      (status === 'DRAFT' || status === 'REJECTED' || approvedAdaptationMode));
  const isLockedDetailView =
    !isCreating &&
    Boolean(selectedStrategy) &&
    (status === 'APPROVED' || status === 'ARCHIVED') &&
    !approvedAdaptationMode;

  const visionAlignedWithServer =
    !selectedStrategy || alignedVisionId === selectedStrategy.alignedVisionId;
  const canEditLinks =
    Boolean(selectedStrategy && selectedStrategyId && !isCreating) &&
    canUpdate &&
    canEditFields &&
    visionAlignedWithServer;

  const alignmentCreateOpen =
    isCreating && canCreate && Boolean(directionId && alignedVisionId);
  const alignmentEditOpen =
    Boolean(!isCreating && selectedStrategyId && alignedVisionId && visionAlignedWithServer);
  const showAlignmentWorkbench = alignmentCreateOpen || alignmentEditOpen;
  /** Édition coches : brouillon avec update, ou stratégie persistée éditable. */
  const pickAlignmentEnabled =
    (alignmentCreateOpen && canUpdate) || Boolean(alignmentEditOpen && canEditLinks);
  const getAxisPresentation = useCallback((axisName: string) => {
    const { logo, title, color } = splitAxisLogoAndTitle(axisName);
    const AxisIcon =
      logo && logo in STRATEGIC_AXIS_ICONS
        ? STRATEGIC_AXIS_ICONS[logo as keyof typeof STRATEGIC_AXIS_ICONS]
        : null;
    return { title, AxisIcon, colorClass: strategicAxisIconColorClass(color) };
  }, []);

  const axesForVision = useMemo(() => {
    const all = axesQ.data ?? [];
    return [...all]
      .filter((a) => a.visionId === alignedVisionId)
      .sort((a, b) => {
        const ao = a.orderIndex ?? 0;
        const bo = b.orderIndex ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, 'fr');
      });
  }, [axesQ.data, alignedVisionId]);

  const axisIdsVision = useMemo(() => new Set(axesForVision.map((a) => a.id)), [axesForVision]);

  const objectivesEligible = useMemo(() => {
    const objs = objectivesQ.data ?? [];
    const enforceAxisSubset = selectedAxisIds.length > 0;
    return [...objs]
      .filter((o) => axisIdsVision.has(o.axisId))
      .filter((o) => !enforceAxisSubset || selectedAxisIds.includes(o.axisId))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }, [objectivesQ.data, axisIdsVision, selectedAxisIds]);

  const toggleLinkedAxis = useCallback(
    (axisId: string) => {
      setSelectedAxisIds((prev) => {
        const removing = prev.includes(axisId);
        const next = removing ? prev.filter((id) => id !== axisId) : [...prev, axisId];
        setSelectedObjectiveIds((oids) =>
          oids.filter((oid) => {
            const obj = objectivesQ.data?.find((o) => o.id === oid);
            if (!obj || !axisIdsVision.has(obj.axisId)) return false;
            if (next.length === 0) return true;
            return next.includes(obj.axisId);
          }),
        );
        return next;
      });
    },
    [objectivesQ.data, axisIdsVision],
  );

  const toggleLinkedObjective = useCallback((objectiveId: string) => {
    setSelectedObjectiveIds((prev) =>
      prev.includes(objectiveId) ? prev.filter((id) => id !== objectiveId) : [...prev, objectiveId],
    );
  }, []);

  const alignedVisionMeta = useMemo(() => {
    const sv = selectedStrategy?.alignedVision;
    const fromStrategy =
      sv && sv.id === alignedVisionId ? { ...sv } : null;
    const fromList = visionsQ.data?.find((v) => v.id === alignedVisionId);
    return {
      title: fromStrategy?.title ?? fromList?.title ?? visionById.get(alignedVisionId)?.title ?? '—',
      horizonLabel:
        fromStrategy?.horizonLabel ??
        fromList?.horizonLabel ??
        visionById.get(alignedVisionId)?.horizonLabel ??
        '',
      isActive: fromStrategy?.isActive ?? fromList?.isActive ?? false,
    };
  }, [selectedStrategy?.alignedVision, alignedVisionId, visionsQ.data, visionById]);

  const showFormPanel = isCreating || (Boolean(selectedStrategyId) && !isLockedDetailView);

  const resetEmptyDraft = useCallback(() => {
    const activeVision = (visionsQ.data ?? []).find((v) => v.isActive) ?? visionsQ.data?.[0] ?? null;
    setTitle('');
    setAmbition('');
    setContext('');
    setHorizonLabel(activeVision?.horizonLabel ?? '');
    setOwnerLabel('');
    setPriorityRows([emptyPriority()]);
    setOutcomeRows([emptyOutcome()]);
    setKpiRows([emptyKpi()]);
    setInitiativeRows([emptyInitiative()]);
    setRiskRows([emptyRisk()]);
    setRejectionReason('');
    setAlignedVisionId(activeVision?.id ?? '');
    setOwnerResourceId('');
    setAdaptationReason('');
    setAdaptationEditEnabled(false);
  }, [visionsQ.data]);

  const startCreate = useCallback(() => {
    setFormError('');
    setSelectedStrategyId(null);
    setIsCreating(true);
    setSelectedAxisIds([]);
    setSelectedObjectiveIds([]);
    const firstDir = directionsQ.data?.[0]?.id ?? '';
    setDirectionId(filterDirectionId || firstDir);
    resetEmptyDraft();
  }, [directionsQ.data, filterDirectionId, resetEmptyDraft]);

  const closePanel = useCallback(() => {
    setIsCreating(false);
    setSelectedStrategyId(null);
    setFormError('');
    setAdaptationReason('');
    setAdaptationEditEnabled(false);
  }, []);

  useEffect(() => {
    if (!isCreating || !canRead) return;
    if (!directionId && (directionsQ.data?.length ?? 0) > 0) {
      setDirectionId(filterDirectionId || directionsQ.data![0].id);
    }
  }, [isCreating, directionId, directionsQ.data, filterDirectionId, canRead]);

  useEffect(() => {
    if (isCreating) return;
    if (!selectedStrategyId || !selectedStrategy || selectedStrategy.id !== selectedStrategyId) return;

    setDirectionId(selectedStrategy.directionId);
    setAlignedVisionId(selectedStrategy.alignedVisionId);
    setTitle(selectedStrategy.title ?? '');
    setAmbition(selectedStrategy.ambition ?? '');
    setContext(selectedStrategy.context ?? '');
    setHorizonLabel(selectedStrategy.horizonLabel);
    setOwnerLabel(selectedStrategy.ownerLabel ?? '');
    setOwnerResourceId('');
    setPriorityRows(prioritiesFromApi(selectedStrategy.strategicPriorities));
    setOutcomeRows(outcomesFromApi(selectedStrategy.expectedOutcomes));
    setKpiRows(kpisFromApi(selectedStrategy.kpis));
    setInitiativeRows(initiativesFromApi(selectedStrategy.majorInitiatives));
    setRiskRows(risksFromApi(selectedStrategy.risks));
    setRejectionReason(selectedStrategy.rejectionReason ?? '');
    setAdaptationReason('');
    setAdaptationEditEnabled(false);
  }, [isCreating, selectedStrategyId, selectedStrategy]);

  useEffect(() => {
    if (isCreating) {
      return;
    }
    if (!selectedStrategyId) {
      setSelectedAxisIds([]);
      setSelectedObjectiveIds([]);
      return;
    }
    if (!linksQ.data) return;
    setSelectedAxisIds(linksQ.data.axes.map((r) => r.id));
    setSelectedObjectiveIds(linksQ.data.objectives.map((r) => r.id));
  }, [isCreating, selectedStrategyId, linksQ.data]);

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">strategic_direction_strategy.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  const formLoading = Boolean(selectedStrategyId && !isCreating && !strategyInList && detailQ.isLoading);
  const formLoadError = Boolean(selectedStrategyId && !isCreating && !strategyInList && detailQ.isError);

  return (
    <PageContainer>
      <PageHeader
        title="Stratégie de direction"
        description="Liste, création et mise à jour des stratégies par direction — soumission et revue CODIR."
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreate ? (
              <Button type="button" onClick={() => startCreate()}>
                Nouvelle stratégie
              </Button>
            ) : null}
          </div>
        }
      />

      <Card
        size="sm"
        className="!gap-0 !py-0 max-h-[min(72vh,760px)] min-h-[260px] overflow-hidden shadow-sm"
      >
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-semibold">Stratégies</CardTitle>
          <CardDescription>
            Filtres intégrés — clique une ligne pour ouvrir la fiche <span className="text-foreground">sous cette liste</span>.
          </CardDescription>
          <CardAction className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetListFilters}>
              Réinitialiser les filtres
            </Button>
          </CardAction>
        </CardHeader>

        <div className="shrink-0 border-b border-border/50 bg-muted/25 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:max-w-[14rem]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Direction
              </span>
              <select
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                value={filterDirectionId}
                onChange={(event) => setFilterDirectionId(event.target.value)}
              >
                <option value="">Toutes</option>
                {(directionsQ.data ?? []).map((direction) => (
                  <option key={direction.id} value={direction.id}>
                    {direction.name} ({direction.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:max-w-[14rem]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Vision
              </span>
              <select
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                value={filterVisionId}
                onChange={(event) => setFilterVisionId(event.target.value)}
              >
                <option value="">Toutes</option>
                {(visionsQ.data ?? []).map((vision) => (
                  <option key={vision.id} value={vision.id}>
                    {vision.title} ({vision.horizonLabel})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[8rem] flex-col gap-1 sm:w-36">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Statut
              </span>
              <select
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(
                    event.target.value as
                      | 'DRAFT'
                      | 'SUBMITTED'
                      | 'APPROVED'
                      | 'REJECTED'
                      | 'ARCHIVED'
                      | '',
                  )
                }
              >
                <option value="">Tous (hors archivées)</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1 text-xs text-muted-foreground sm:mt-5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={filterIncludeArchived}
                onChange={(e) => setFilterIncludeArchived(e.target.checked)}
              />
              <span>Inclure les stratégies archivées</span>
            </label>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 sm:max-w-[20rem]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recherche
              </span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="titre, ambition, direction…"
              />
            </label>
          </div>
        </div>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden !p-0">
          <div
            ref={tablePan.scrollRef}
            data-slot="table-container"
            onMouseDown={tablePan.onMouseDown}
            className={cn(
              'min-h-0 flex-1 overflow-auto',
              tablePan.isPanning ? 'cursor-grabbing select-none' : 'cursor-grab',
            )}
          >
            <table className="min-w-[52rem] w-full text-sm">
              <thead className="sticky top-0 z-[1] border-b border-border/60 bg-muted/90 backdrop-blur">
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Direction</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Titre</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Vision</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">Statut</th>
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">MAJ</th>
                </tr>
              </thead>
              <tbody>
                {(strategiesQ.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      Aucune stratégie pour ces filtres. Réinitialise les filtres ou crée une stratégie.
                    </td>
                  </tr>
                ) : (
                  (strategiesQ.data ?? []).map((strategy) => (
                    <tr
                      key={strategy.id}
                      className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${
                        selectedStrategyId === strategy.id && !isCreating ? 'bg-muted/40' : ''
                      }`}
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedStrategyId(strategy.id);
                        setFormError('');
                      }}
                    >
                      <td className="p-3 align-top">{directionLabel(strategy)}</td>
                      <td className="p-3 align-top font-medium">{strategy.title ?? 'Sans titre'}</td>
                      <td className="p-3 align-top text-muted-foreground">{visionTitleCell(strategy)}</td>
                      <td className="p-3 align-top">{strategy.status}</td>
                      <td className="p-3 align-top text-muted-foreground">
                        {new Date(strategy.updatedAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground sm:px-4">
          {(strategiesQ.data ?? []).length} stratégie(s) avec les filtres actuels
        </CardFooter>
      </Card>

      <div className="mt-6 space-y-4">
        {isLockedDetailView && selectedStrategy ? (
          <ReadOnlyStrategyDetail
            strategy={selectedStrategy}
            links={linksQ.data ?? null}
            linksLoading={linksQ.isLoading}
            linksError={linksQ.isError}
            directionLabel={directionLabel(selectedStrategy)}
            getAxisPresentation={getAxisPresentation}
            canUpdate={canUpdate}
            archivePending={archiveMutation.isPending}
            onAdapt={() => {
              setFormError('');
              setAdaptationDialogOpen(true);
            }}
            onArchive={() => setArchiveDialogOpen(true)}
            onClose={() => {
              setSelectedStrategyId(null);
              setFormError('');
            }}
          />
        ) : (
          <Alert>
            <AlertDescription>
              Clique une ligne pour ouvrir la fiche, ou utilise <strong>Nouvelle stratégie</strong>. Les versions
              <em> approuvées</em> et <em>archivées</em> s’affichent en lecture seule sous la liste.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Dialog
        open={showFormPanel}
        onOpenChange={(open) => {
          if (open) return;
          closePanel();
        }}
      >
        <DialogContent className="sm:max-w-6xl max-h-[85dvh] overflow-y-auto" showCloseButton>
          {formLoading ? (
            <Alert>
              <AlertDescription>Chargement de la stratégie…</AlertDescription>
            </Alert>
          ) : formLoadError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Impossible de charger cette stratégie (hors filtres ou supprimée). Ferme la modale ou réinitialise les
                filtres.
              </AlertDescription>
            </Alert>
          ) : (
            <Card size="sm" className="shadow-sm">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base">
                  {isCreating ? 'Nouvelle stratégie' : selectedStrategy?.title ?? 'Stratégie'}
                </CardTitle>
                <CardDescription>
                  {isCreating
                    ? 'Renseigne la direction, la vision alignée, puis le contenu — enregistre pour créer le brouillon.'
                    : `Statut : ${status}${selectedStrategy ? ` · ${directionLabel(selectedStrategy)}` : ''}`}
                </CardDescription>
                {!isCreating && selectedStrategy ? (
                  <CardAction>
                    <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-xs font-medium">
                      {status}
                    </span>
                  </CardAction>
                ) : null}
              </CardHeader>

              {/* Le contenu du formulaire reste inchangé, mais est désormais rendu dans la modale.
                 On évite ici de recopier tout le JSX : on conserve le bloc existant en dessous via un wrapper. */}
              <CardContent className="space-y-6">
                {status === 'ARCHIVED' ? (
                  <Alert>
                    <AlertDescription>
                      Stratégie <strong>archivée</strong> — fiche en lecture seule. Tu peux créer une nouvelle stratégie
                      pour la même direction et vision : l’archivage libère l’emplacement actif côté référentiel.
                      {selectedStrategy?.archivedAt ? (
                        <>
                          {' '}
                          Archivée le{' '}
                          {new Date(selectedStrategy.archivedAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                          .
                        </>
                      ) : null}
                      {selectedStrategy?.archivedReason ? (
                        <>
                          {' '}
                          Motif d’archivage : <strong>{selectedStrategy.archivedReason}</strong>.
                        </>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <section className={sectionShellClass()}>
                  <h3 className="text-sm font-semibold text-foreground">Synthèse</h3>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-foreground">Direction</span>
                    <div className="flex gap-2">
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={directionId}
                        onChange={(event) => setDirectionId(event.target.value)}
                        disabled={!canEditFields || (!isCreating && Boolean(selectedStrategy))}
                      >
                        <option value="">Choisir une direction</option>
                        {(directionsQ.data ?? []).map((direction) => (
                          <option key={direction.id} value={direction.id}>
                            {direction.name} ({direction.code})
                          </option>
                        ))}
                      </select>
                      {canManageDirections ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => setCreateDirectionOpen(true)}
                        >
                          Ajouter
                        </Button>
                      ) : null}
                    </div>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-foreground">Titre</span>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Titre de la stratégie"
                      disabled={!canEditFields}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-foreground">Ambition</span>
                    <textarea
                      value={ambition}
                      onChange={(event) => setAmbition(event.target.value)}
                      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Ambition stratégique de la direction"
                      disabled={!canEditFields}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Statut CODIR : <span className="font-medium text-foreground">{status}</span>
                    {status === 'ARCHIVED' && selectedStrategy?.archivedAt ? (
                      <span className="ml-2 text-muted-foreground">
                        · archivée le {new Date(selectedStrategy.archivedAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : null}
                  </p>
                  {selectedStrategy && status === 'APPROVED' && !approvedAdaptationMode ? (
                    <Alert>
                      <AlertDescription>
                        Cette version approuvée est verrouillée. Utilise{' '}
                        <strong>Adapter cette stratégie</strong> pour ouvrir une session d’édition avec archivage
                        automatique de l’état approuvé.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {selectedStrategy && status === 'APPROVED' && approvedAdaptationMode ? (
                    <Alert>
                      <AlertDescription>
                        Mode adaptation actif. Motif: <strong>{adaptationReason}</strong>. À l’enregistrement, un
                        snapshot archivé est créé automatiquement avant mise à jour.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <HumanResourceCombobox
                        id="strategic-direction-owner"
                        value={ownerResourceId}
                        onChange={(resourceId) => setOwnerResourceId(resourceId)}
                        onPickResource={(resource) => setOwnerLabel(humanResourceLeadLabel(resource))}
                        fallbackLabel={ownerLabel || null}
                        disabled={!canEditFields}
                        dialogOpen={showFormPanel}
                        label="Responsable"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          disabled={!canEditFields || !ownerLabel}
                          onClick={() => {
                            setOwnerLabel('');
                            setOwnerResourceId('');
                          }}
                        >
                          Vider
                        </Button>
                      </div>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-foreground">Horizon</span>
                      <Input
                        value={horizonLabel}
                        onChange={(event) => setHorizonLabel(event.target.value)}
                        placeholder="Ex. 2026-2028"
                        disabled={!canEditFields}
                      />
                    </label>
                  </div>
                </section>

                <StrategicDirectionCreateEditDialog
                  mode="create"
                  open={createDirectionOpen}
                  onOpenChange={setCreateDirectionOpen}
                  direction={null}
                  onSuccess={(created) => {
                    setDirectionId(created.id);
                    setCreateDirectionOpen(false);
                  }}
                />

                <section className={sectionShellClass()}>
                  <h3 className="text-sm font-semibold text-foreground">Alignement stratégique</h3>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-foreground">Vision alignée</span>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={alignedVisionId}
                      onChange={(event) => setAlignedVisionId(event.target.value)}
                      disabled={!canEditFields}
                    >
                      <option value="">Choisir une vision</option>
                      {(visionsQ.data ?? []).map((vision) => (
                        <option key={vision.id} value={vision.id}>
                          {vision.title} ({vision.horizonLabel})
                        </option>
                      ))}
                    </select>
                  </label>

                  {alignedVisionId ? (
                    <div className="rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">{alignedVisionMeta.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Période : {alignedVisionMeta.horizonLabel || '—'} ·{' '}
                        {alignedVisionMeta.isActive ? 'Vision active' : 'Vision inactive'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Choisis une vision pour afficher l’alignement.</p>
                  )}

                  {isCreating && canCreate ? (
                    !directionId || !alignedVisionId ? (
                      <Alert>
                        <AlertDescription>
                          {!directionId && !alignedVisionId
                            ? 'Choisis une direction et une vision : les axes et objectifs proposés se mettent à jour dynamiquement selon cette vision.'
                            : !directionId
                              ? 'Choisis une direction pour continuer.'
                              : 'Choisis une vision alignée : les listes axes / objectifs suivent cette vision dans le référentiel.'}
                        </AlertDescription>
                      </Alert>
                    ) : !canUpdate ? (
                      <Alert>
                        <AlertDescription>
                          Sans la permission{' '}
                          <code className="text-xs">strategic_direction_strategy.update</code>, tu peux consulter les
                          listes ci-dessous mais les coches ne seront pas persistées à la création du brouillon.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Listes dynamiques selon ta vision sélectionnée : les coches sont enregistrées quand tu cliques
                        sur « Créer le brouillon ».
                      </p>
                    )
                  ) : null}

                  {!isCreating && !visionAlignedWithServer ? (
                    <Alert>
                      <AlertDescription>
                        La vision sélectionnée diffère de celle enregistrée sur la stratégie. Enregistre la fiche pour
                        pouvoir mettre à jour les liens axes / objectifs.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {showAlignmentWorkbench ? (
                    <div className="space-y-4">
                      {alignmentEditOpen && linksQ.isLoading ? (
                        <p className="text-xs text-muted-foreground">Chargement des liens…</p>
                      ) : null}
                      {alignmentEditOpen && linksQ.isError ? (
                        <Alert variant="destructive">
                          <AlertDescription>
                            Impossible de charger les liens vision / axes / objectifs.
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      {pickAlignmentEnabled || alignmentCreateOpen ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Axes de la vision
                            </p>
                            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border/50 bg-background p-2">
                              {axesForVision.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Aucun axe pour cette vision dans le référentiel.
                                </p>
                              ) : (
                                axesForVision.map((axis) => (
                                  <label key={axis.id} className="flex cursor-pointer items-start gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-input"
                                      disabled={!pickAlignmentEnabled}
                                      checked={selectedAxisIds.includes(axis.id)}
                                      onChange={() => toggleLinkedAxis(axis.id)}
                                    />
                                    <span>
                                      <span className="font-medium text-foreground">
                                        {(() => {
                                          const { title, AxisIcon, colorClass } = getAxisPresentation(axis.name);
                                          return (
                                            <>
                                              {AxisIcon ? (
                                                <AxisIcon
                                                  className={cn(
                                                    'mr-1 inline-block size-4 align-text-bottom',
                                                    colorClass,
                                                  )}
                                                />
                                              ) : null}
                                              {title}
                                            </>
                                          );
                                        })()}
                                      </span>
                                      {axis.orderIndex != null ? (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                          (ordre {axis.orderIndex})
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                            {selectedAxisIds.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Aucun axe lié pour l’instant — coche les axes stratégiques de la vision pour commencer
                                l’alignement.
                              </p>
                            ) : (
                              <ul className="list-inside list-disc text-xs text-muted-foreground">
                                {selectedAxisIds.map((id) => {
                                  const ax = axesForVision.find((a) => a.id === id);
                                  if (!ax) return <li key={id}>—</li>;
                                  const { title, AxisIcon, colorClass } = getAxisPresentation(ax.name);
                                  return (
                                    <li key={id}>
                                      {AxisIcon ? (
                                        <AxisIcon
                                          className={cn(
                                            'mr-1 inline-block size-3.5 align-text-bottom',
                                            colorClass,
                                          )}
                                        />
                                      ) : null}
                                      {title}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            {!isCreating ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={replaceAxesMutation.isPending}
                                onClick={() => {
                                  if (!selectedStrategyId) return;
                                  replaceAxesMutation.mutate({
                                    strategyId: selectedStrategyId,
                                    strategicAxisIds: selectedAxisIds,
                                  });
                                }}
                              >
                                {replaceAxesMutation.isPending ? 'Enregistrement…' : 'Enregistrer les axes liés'}
                              </Button>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Objectifs stratégiques
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedAxisIds.length > 0
                                ? 'Seuls les objectifs rattachés aux axes cochés sont proposés (aligné avec la règle serveur).'
                                : 'Aucun axe coché : tous les objectifs de la vision sont proposés ; dès qu’au moins un axe est lié, la sélection se restreint à ces axes.'}
                            </p>
                            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/50 bg-background p-2">
                              {objectivesEligible.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Aucun objectif disponible avec les filtres actuels.
                                </p>
                              ) : (
                                objectivesEligible.map((obj) => (
                                  <label key={obj.id} className="flex cursor-pointer items-start gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-input"
                                      disabled={!pickAlignmentEnabled}
                                      checked={selectedObjectiveIds.includes(obj.id)}
                                      onChange={() => toggleLinkedObjective(obj.id)}
                                    />
                                    <span>
                                      <span className="font-medium text-foreground">{obj.title}</span>
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        {(() => {
                                          const axisName =
                                            axesForVision.find((a) => a.id === obj.axisId)?.name ?? '';
                                          const { title, AxisIcon, colorClass } =
                                            getAxisPresentation(axisName);
                                          return (
                                            <>
                                              {' · axe '}
                                              {AxisIcon ? (
                                                <AxisIcon
                                                  className={cn(
                                                    'mr-1 inline-block size-3.5 align-text-bottom',
                                                    colorClass,
                                                  )}
                                                />
                                              ) : null}
                                              {title}
                                              {' · '}
                                              {objectiveStatusLabel(obj.status)}
                                            </>
                                          );
                                        })()}
                                      </span>
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                            {selectedObjectiveIds.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Aucun objectif lié pour l’instant — coche les objectifs qui concrétisent l’alignement
                                avec la vision.
                              </p>
                            ) : (
                              <ul className="list-inside list-disc text-xs text-muted-foreground">
                                {selectedObjectiveIds.map((oid) => {
                                  const obj = objectivesQ.data?.find((o) => o.id === oid);
                                  const axisName = axesForVision.find((a) => a.id === obj?.axisId)?.name ?? '';
                                  const { title, AxisIcon, colorClass } = getAxisPresentation(axisName);
                                  return (
                                    <li key={oid}>
                                      {obj?.title ?? '—'}
                                      <span className="text-muted-foreground">
                                        {' · '}
                                        {AxisIcon ? (
                                          <AxisIcon
                                            className={cn(
                                              'mr-1 inline-block size-3.5 align-text-bottom',
                                              colorClass,
                                            )}
                                          />
                                        ) : null}
                                        {title}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            {!isCreating ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={replaceObjectivesMutation.isPending}
                                onClick={() => {
                                  if (!selectedStrategyId) return;
                                  replaceObjectivesMutation.mutate({
                                    strategyId: selectedStrategyId,
                                    strategicObjectiveIds: selectedObjectiveIds,
                                  });
                                }}
                              >
                                {replaceObjectivesMutation.isPending
                                  ? 'Enregistrement…'
                                  : 'Enregistrer les objectifs liés'}
                              </Button>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {alignmentEditOpen && !pickAlignmentEnabled && linksQ.data ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Axes liés</p>
                            {linksQ.data.axes.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Aucun axe lié pour l’instant — coche les axes stratégiques de la vision pour commencer
                                l’alignement.
                              </p>
                            ) : (
                              <ul className="list-inside list-disc text-xs text-muted-foreground">
                                {linksQ.data.axes.map((axis) => (
                                  <li key={axis.id}>{axis.name}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Objectifs liés
                            </p>
                            {linksQ.data.objectives.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Aucun objectif lié pour l’instant — coche les objectifs qui concrétisent l’alignement
                                avec la vision.
                              </p>
                            ) : (
                              <ul className="list-inside list-disc text-xs text-muted-foreground">
                                {linksQ.data.objectives.map((obj) => (
                                  <li key={obj.id}>
                                    {obj.title}{' '}
                                    <span className="text-muted-foreground">
                                      · axe {obj.axis.name} · {objectiveStatusLabel(obj.status)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className={sectionShellClass()}>
                  <h3 className="text-sm font-semibold text-foreground">Cadre</h3>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-foreground">Contexte</span>
                    <textarea
                      value={context}
                      onChange={(event) => setContext(event.target.value)}
                      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Contexte et enjeux"
                      disabled={!canEditFields}
                    />
                  </label>
                </section>

                <section className={sectionShellClass()}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">Priorités stratégiques</span>
                    {canEditFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPriorityRows((r) => [...r, emptyPriority()])}
                      >
                        Ajouter
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {priorityRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Titre</span>
                          <Input
                            value={row.title}
                            onChange={(event) =>
                              setPriorityRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, title: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Description</span>
                          <Input
                            value={row.description}
                            onChange={(event) =>
                              setPriorityRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, description: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        {canEditFields && priorityRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-self-end"
                            onClick={() => setPriorityRows((rows) => rows.filter((x) => x.id !== row.id))}
                          >
                            Retirer
                          </Button>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={sectionShellClass()}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">Résultats attendus</span>
                    {canEditFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOutcomeRows((r) => [...r, emptyOutcome()])}
                      >
                        Ajouter
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {outcomeRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Résultat</span>
                          <Input
                            value={row.label}
                            onChange={(event) =>
                              setOutcomeRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, label: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Cible</span>
                          <Input
                            value={row.target}
                            onChange={(event) =>
                              setOutcomeRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, target: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        {canEditFields && outcomeRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-self-end"
                            onClick={() => setOutcomeRows((rows) => rows.filter((x) => x.id !== row.id))}
                          >
                            Retirer
                          </Button>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={sectionShellClass()}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">KPI</span>
                    {canEditFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setKpiRows((r) => [...r, emptyKpi()])}
                      >
                        Ajouter
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {kpiRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Nom</span>
                          <Input
                            value={row.name}
                            onChange={(event) =>
                              setKpiRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, name: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Cible</span>
                          <Input
                            value={row.target}
                            onChange={(event) =>
                              setKpiRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, target: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Unité</span>
                          <Input
                            value={row.unit}
                            onChange={(event) =>
                              setKpiRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, unit: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        {canEditFields && kpiRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-self-end"
                            onClick={() => setKpiRows((rows) => rows.filter((x) => x.id !== row.id))}
                          >
                            Retirer
                          </Button>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={sectionShellClass()}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">Chantiers pressentis</span>
                    {canEditFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInitiativeRows((r) => [...r, emptyInitiative()])}
                      >
                        Ajouter
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {initiativeRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Chantier</span>
                          <Input
                            value={row.title}
                            onChange={(event) =>
                              setInitiativeRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, title: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Description</span>
                          <Input
                            value={row.description}
                            onChange={(event) =>
                              setInitiativeRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, description: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        {canEditFields && initiativeRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-self-end"
                            onClick={() => setInitiativeRows((rows) => rows.filter((x) => x.id !== row.id))}
                          >
                            Retirer
                          </Button>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={sectionShellClass()}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">Risques / vigilance</span>
                    {canEditFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRiskRows((r) => [...r, emptyRisk()])}
                      >
                        Ajouter
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {riskRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Risque</span>
                          <Input
                            value={row.label}
                            onChange={(event) =>
                              setRiskRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, label: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Mitigation</span>
                          <Input
                            value={row.mitigation}
                            onChange={(event) =>
                              setRiskRows((rows) =>
                                rows.map((x) => (x.id === row.id ? { ...x, mitigation: event.target.value } : x)),
                              )
                            }
                            disabled={!canEditFields}
                          />
                        </label>
                        {canEditFields && riskRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-self-end"
                            onClick={() => setRiskRows((rows) => rows.filter((x) => x.id !== row.id))}
                          >
                            Retirer
                          </Button>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={sectionShellClass()}>
                  <h3 className="text-sm font-semibold text-foreground">Décision CODIR</h3>

                  {formError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {(status === 'SUBMITTED' || status === 'REJECTED') && selectedStrategy ? (
                    <label className="space-y-1 text-sm">
                      <span className="text-muted-foreground">Motif de rejet (requis pour rejeter)</span>
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Préciser les ajustements attendus…"
                        disabled={!canReview || status !== 'SUBMITTED'}
                      />
                    </label>
                  ) : null}

                  <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                    {canUpdate &&
                    selectedStrategy &&
                    status === 'APPROVED' &&
                    !approvedAdaptationMode ? (
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => {
                          setFormError('');
                          setAdaptationDialogOpen(true);
                        }}
                      >
                        Adapter cette stratégie
                      </Button>
                    ) : null}

                    {canUpdate &&
                    selectedStrategy &&
                    status === 'APPROVED' &&
                    approvedAdaptationMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAdaptationEditEnabled(false);
                          setAdaptationReason('');
                          setFormError('');
                        }}
                      >
                        Annuler l’adaptation
                      </Button>
                    ) : null}

                    {((isCreating && canCreate) ||
                      (!isCreating &&
                        selectedStrategy &&
                        canUpdate &&
                        (status === 'DRAFT' || status === 'REJECTED' || approvedAdaptationMode))) ? (
                      <Button
                        type="button"
                        onClick={() => {
                          setFormError('');
                          const strategicPriorities = toStrategicPrioritiesPayload(priorityRows);
                          const expectedOutcomes = toExpectedOutcomesPayload(outcomeRows);
                          const kpis = toKpisPayload(kpiRows);
                          const majorInitiatives = toMajorInitiativesPayload(initiativeRows);
                          const risks = toRisksPayload(riskRows);
                          if (!directionId || !alignedVisionId || !title.trim() || !ambition.trim() || !context.trim()) {
                            setFormError('Direction, vision, titre, ambition et contexte sont requis.');
                            return;
                          }
                          if (
                            !isCreating &&
                            selectedStrategy?.status === 'APPROVED' &&
                            approvedAdaptationMode &&
                            adaptationReason.trim().length === 0
                          ) {
                            setFormError(
                              'Le motif d’adaptation est requis pour modifier une stratégie approuvée.',
                            );
                            return;
                          }
                          if (isCreating && canCreate) {
                            const axisIdsSnapshot = [...selectedAxisIds];
                            const objectiveIdsSnapshot = [...selectedObjectiveIds];
                            void (async () => {
                              try {
                                const created = await createMutation.mutateAsync({
                                  directionId,
                                  alignedVisionId,
                                  title: title.trim(),
                                  ambition: ambition.trim(),
                                  context: context.trim(),
                                  strategicPriorities,
                                  expectedOutcomes,
                                  kpis,
                                  majorInitiatives,
                                  risks,
                                  horizonLabel: horizonLabel.trim(),
                                  ownerLabel: ownerLabel.trim() || undefined,
                                });
                                setIsCreating(false);
                                setSelectedStrategyId(created.id);
                                if (!canUpdate) return;
                                await replaceAxesMutation.mutateAsync({
                                  strategyId: created.id,
                                  strategicAxisIds: axisIdsSnapshot,
                                });
                                await replaceObjectivesMutation.mutateAsync({
                                  strategyId: created.id,
                                  strategicObjectiveIds: objectiveIdsSnapshot,
                                });
                              } catch {
                                setFormError(
                                  'Création ou enregistrement des liens impossible — vérifie les champs ou les permissions.',
                                );
                              }
                            })();
                            return;
                          }
                          if (selectedStrategy) {
                            updateMutation.mutate({
                              strategyId: selectedStrategy.id,
                              body: {
                                alignedVisionId,
                                title: title.trim(),
                                ambition: ambition.trim(),
                                context: context.trim(),
                                strategicPriorities,
                                expectedOutcomes,
                                kpis,
                                majorInitiatives,
                                risks,
                                horizonLabel: horizonLabel.trim(),
                                ownerLabel: ownerLabel.trim() || undefined,
                                archiveReason:
                                  selectedStrategy.status === 'APPROVED' && approvedAdaptationMode
                                    ? adaptationReason.trim()
                                    : undefined,
                              },
                            });
                          }
                        }}
                      >
                        {isCreating ? 'Créer le brouillon' : 'Enregistrer'}
                      </Button>
                    ) : null}

                    {canUpdate &&
                    selectedStrategy &&
                    status !== 'SUBMITTED' &&
                    status !== 'APPROVED' &&
                    status !== 'ARCHIVED' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!visionAlignedWithServer}
                        title={
                          !visionAlignedWithServer
                            ? 'Enregistre la stratégie après changement de vision avant la soumission au CODIR.'
                            : undefined
                        }
                        onClick={() =>
                          submitMutation.mutate({
                            strategyId: selectedStrategy.id,
                            alignedVisionId: selectedStrategy.alignedVisionId,
                          })
                        }
                      >
                        Soumettre au CODIR
                      </Button>
                    ) : null}

                    {canReview && selectedStrategy && status === 'SUBMITTED' ? (
                      <>
                        <Button
                          type="button"
                          onClick={() =>
                            reviewMutation.mutate({
                              strategyId: selectedStrategy.id,
                              body: { decision: 'APPROVED' },
                            })
                          }
                        >
                          Approuver
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() =>
                            reviewMutation.mutate({
                              strategyId: selectedStrategy.id,
                              body: { decision: 'REJECTED', rejectionReason: rejectionReason.trim() },
                            })
                          }
                        >
                          Rejeter
                        </Button>
                      </>
                    ) : null}

                    {canUpdate && selectedStrategy && status === 'APPROVED' && !approvedAdaptationMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={archiveMutation.isPending}
                        onClick={() => setArchiveDialogOpen(true)}
                      >
                        {archiveMutation.isPending ? 'Archivage…' : 'Archiver cette version approuvée'}
                      </Button>
                    ) : null}
                  </div>
                </section>

                <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                  <DialogContent showCloseButton={!archiveMutation.isPending}>
                    <DialogHeader>
                      <DialogTitle>Archiver la stratégie approuvée</DialogTitle>
                      <DialogDescription>
                        La stratégie passera en lecture seule (`ARCHIVED`) et un nouveau cycle pourra être créé pour la
                        même direction et vision. Renseigne le motif d’archivage.
                      </DialogDescription>
                    </DialogHeader>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-foreground">Motif d’archivage</span>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={archiveReason}
                        onChange={(event) => setArchiveReason(event.target.value)}
                        placeholder="Ex. Fin de cycle CODIR 2026, lancement d’une nouvelle version..."
                        disabled={archiveMutation.isPending}
                      />
                    </label>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={archiveMutation.isPending}
                        onClick={() => {
                          setArchiveDialogOpen(false);
                          setArchiveReason('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        disabled={archiveMutation.isPending || archiveReason.trim().length === 0}
                        onClick={() => {
                          if (!selectedStrategy || archiveReason.trim().length === 0) return;
                          const archiveReasonSnapshot = archiveReason.trim();
                          setArchiveDialogOpen(false);
                          setArchiveReason('');
                          archiveMutation.mutate(
                            { strategyId: selectedStrategy.id, reason: archiveReasonSnapshot },
                            {
                              onSuccess: () => {
                                setSelectedStrategyId(null);
                                setFormError('');
                              },
                              onError: (error) => {
                                const message =
                                  error instanceof Error ? error.message : 'Archivage impossible. Réessaie.';
                                setFormError(message);
                              },
                            },
                          );
                        }}
                      >
                        {archiveMutation.isPending ? 'Archivage…' : 'Confirmer l’archivage'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={adaptationDialogOpen} onOpenChange={setAdaptationDialogOpen}>
                  <DialogContent showCloseButton>
                    <DialogHeader>
                      <DialogTitle>Adapter une stratégie approuvée</DialogTitle>
                      <DialogDescription>
                        Cette action ouvre l’édition et déclenchera l’archivage automatique de l’ancienne version
                        approuvée au moment de l’enregistrement.
                      </DialogDescription>
                    </DialogHeader>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-foreground">Motif d’adaptation</span>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={adaptationReason}
                        onChange={(event) => setAdaptationReason(event.target.value)}
                        placeholder="Ex. Nouveau contexte business, évolution du cadrage, arbitrage CODIR…"
                      />
                    </label>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setAdaptationDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        disabled={adaptationReason.trim().length === 0}
                        onClick={() => {
                          if (adaptationReason.trim().length === 0) return;
                          setAdaptationEditEnabled(true);
                          setAdaptationDialogOpen(false);
                        }}
                      >
                        Démarrer l’adaptation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function ReadOnlyStrategyDetail({
  strategy,
  links,
  linksLoading,
  linksError,
  directionLabel,
  getAxisPresentation,
  canUpdate,
  archivePending,
  onAdapt,
  onArchive,
  onClose,
}: {
  strategy: StrategicDirectionStrategyDto;
  links: { axes: Array<{ id: string; name: string }>; objectives: Array<{ id: string; title: string; status: string; axis: { id: string; name: string } }> } | null;
  linksLoading: boolean;
  linksError: boolean;
  directionLabel: string;
  getAxisPresentation: (axisName: string) => {
    title: string;
    AxisIcon: ComponentType<{ className?: string }> | null;
    colorClass: string;
  };
  canUpdate: boolean;
  archivePending: boolean;
  onAdapt: () => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  const isArchived = strategy.status === 'ARCHIVED';
  const priorities = prioritiesFromApi(strategy.strategicPriorities).filter((r) => r.title.trim());
  const outcomes = outcomesFromApi(strategy.expectedOutcomes).filter((r) => r.label.trim());
  const kpis = kpisFromApi(strategy.kpis).filter((r) => r.name.trim());
  const initiatives = initiativesFromApi(strategy.majorInitiatives).filter((r) => r.title.trim());
  const risks = risksFromApi(strategy.risks).filter((r) => r.label.trim());

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-base">{strategy.title ?? 'Stratégie'}</CardTitle>
        <CardDescription>
          {directionLabel} · Statut : {strategy.status}
          {strategy.alignedVision ? ` · Vision : ${strategy.alignedVision.title}` : ''}
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-xs font-medium">
            {strategy.status}
          </span>
          {canUpdate && !isArchived ? (
            <Button type="button" size="sm" onClick={onAdapt}>
              Adapter cette stratégie
            </Button>
          ) : null}
          {canUpdate && !isArchived ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={archivePending}
              onClick={onArchive}
            >
              {archivePending ? 'Archivage…' : 'Archiver'}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {isArchived ? (
          <Alert>
            <AlertDescription>
              Stratégie <strong>archivée</strong>.
              {strategy.archivedAt
                ? ` Archivée le ${new Date(strategy.archivedAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}.`
                : ''}
              {strategy.archivedReason ? (
                <>
                  {' '}
                  Motif d’archivage : <strong>{strategy.archivedReason}</strong>.
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <section className={sectionShellClass()}>
          <h3 className="text-sm font-semibold text-foreground">Synthèse</h3>
          <DetailField label="Direction" value={directionLabel} />
          <DetailField label="Titre" value={strategy.title ?? '—'} />
          <DetailField label="Ambition" value={strategy.ambition ?? '—'} multiline />
          <DetailField label="Contexte" value={strategy.context ?? '—'} multiline />
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Responsable" value={strategy.ownerLabel || '—'} />
            <DetailField label="Horizon" value={strategy.horizonLabel || '—'} />
          </div>
        </section>

        <section className={sectionShellClass()}>
          <h3 className="text-sm font-semibold text-foreground">Alignement stratégique</h3>
          <DetailField
            label="Vision alignée"
            value={
              strategy.alignedVision
                ? `${strategy.alignedVision.title} (${strategy.alignedVision.horizonLabel})${
                    strategy.alignedVision.isActive ? '' : ' · inactive'
                  }`
                : '—'
            }
          />
          {linksLoading ? (
            <p className="text-xs text-muted-foreground">Chargement des liens vision…</p>
          ) : linksError ? (
            <Alert variant="destructive">
              <AlertDescription>Impossible de charger les liens vision / axes / objectifs.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Axes liés</p>
                {links && links.axes.length > 0 ? (
                  <ul className="list-inside list-disc text-sm text-foreground">
                    {links.axes.map((axis) => {
                      const { title, AxisIcon, colorClass } = getAxisPresentation(axis.name);
                      return (
                        <li key={axis.id}>
                          {AxisIcon ? (
                            <AxisIcon
                              className={cn('mr-1 inline-block size-3.5 align-text-bottom', colorClass)}
                            />
                          ) : null}
                          {title}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun axe lié.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Objectifs liés</p>
                {links && links.objectives.length > 0 ? (
                  <ul className="list-inside list-disc text-sm text-foreground">
                    {links.objectives.map((obj) => {
                      const { title, AxisIcon, colorClass } = getAxisPresentation(obj.axis.name);
                      return (
                        <li key={obj.id}>
                          {obj.title}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {' · '}axe{' '}
                            {AxisIcon ? (
                              <AxisIcon
                                className={cn('mr-1 inline-block size-3.5 align-text-bottom', colorClass)}
                              />
                            ) : null}
                            {title} · {obj.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun objectif lié.</p>
                )}
              </div>
            </>
          )}
        </section>

        <DetailListSection title="Priorités stratégiques" empty="Aucune priorité enregistrée.">
          {priorities.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {priorities.map((row) => (
                <li key={row.id}>
                  <span className="font-medium text-foreground">{row.title}</span>
                  {row.description ? (
                    <span className="ml-1 text-muted-foreground">— {row.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </DetailListSection>

        <DetailListSection title="Résultats attendus" empty="Aucun résultat attendu enregistré.">
          {outcomes.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {outcomes.map((row) => (
                <li key={row.id}>
                  <span className="font-medium text-foreground">{row.label}</span>
                  {row.target ? <span className="ml-1 text-muted-foreground">— cible : {row.target}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </DetailListSection>

        <DetailListSection title="KPI" empty="Aucun KPI enregistré.">
          {kpis.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {kpis.map((row) => (
                <li key={row.id}>
                  <span className="font-medium text-foreground">{row.name}</span>
                  <span className="ml-1 text-muted-foreground">
                    {row.target ? `— cible : ${row.target}` : ''}
                    {row.unit ? ` ${row.unit}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </DetailListSection>

        <DetailListSection title="Initiatives majeures" empty="Aucune initiative enregistrée.">
          {initiatives.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {initiatives.map((row) => (
                <li key={row.id}>
                  <span className="font-medium text-foreground">{row.title}</span>
                  {row.description ? (
                    <span className="ml-1 text-muted-foreground">— {row.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </DetailListSection>

        <DetailListSection title="Risques" empty="Aucun risque enregistré.">
          {risks.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {risks.map((row) => (
                <li key={row.id}>
                  <span className="font-medium text-foreground">{row.label}</span>
                  {row.mitigation ? (
                    <span className="ml-1 text-muted-foreground">— mitigation : {row.mitigation}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </DetailListSection>

        <section className={sectionShellClass()}>
          <h3 className="text-sm font-semibold text-foreground">Schéma directeur</h3>
          <p className="text-sm text-muted-foreground">
            Aucun schéma directeur associé. Quand le module sera connecté, les jalons et initiatives liés s’afficheront
            ici.
          </p>
        </section>

        <section className={sectionShellClass()}>
          <h3 className="text-sm font-semibold text-foreground">Exécution</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <ExecutionPlaceholder
              title="Projets"
              description="Les projets et chantiers pilotés depuis cette stratégie s’afficheront ici — module non connecté pour l’instant."
            />
            <ExecutionPlaceholder
              title="Budgets"
              description="Les enveloppes budgétaires et arbitrages liés à cette stratégie s’afficheront ici — module non connecté pour l’instant."
            />
            <ExecutionPlaceholder
              title="Risques transverses"
              description="Les risques et points de vigilance transverses suivis pour cette stratégie s’afficheront ici — module non connecté pour l’instant."
            />
            <ExecutionPlaceholder
              title="Alertes"
              description="Les alertes opérationnelles ou CODIR remontées sur cette stratégie s’afficheront ici — module non connecté pour l’instant."
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <p
        className={cn(
          'whitespace-pre-wrap rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground',
          multiline ? 'min-h-16' : 'min-h-9',
        )}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function DetailListSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className={sectionShellClass()}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children ?? <p className="text-xs text-muted-foreground">{empty}</p>}
    </section>
  );
}

function ExecutionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/70 bg-background/50 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
