'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Compass, FileText, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTablePan } from '@/hooks/use-table-pan';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/context/auth-context';
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
  useStrategicDirectionStrategyValidatorOptionsQuery,
  useStrategicDirectionStrategyWorkflowSettingsQuery,
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
import type { ApiFormError } from '@/features/budgets/api/types';
import { toast } from '@/lib/toast';
import { StrategicDirectionStrategyAlignmentSection } from './strategic-direction-strategy-alignment-section';
import { StrategicDirectionStrategyVersionComparePanel } from './strategic-direction-strategy-version-compare-panel';
import {
  getStrategicDirectionStrategyStatusLabel,
  STRATEGIC_DIRECTION_STRATEGY_APPROVE_LABEL,
  STRATEGIC_DIRECTION_STRATEGY_REJECT_LABEL,
  STRATEGIC_DIRECTION_STRATEGY_STATUS_FILTER_OPTIONS,
  STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS,
  STRATEGIC_DIRECTION_STRATEGY_SUBMIT_LABEL,
  STRATEGIC_DIRECTION_STRATEGY_VALIDATION_SECTION_TITLE,
} from '../lib/strategic-direction-strategy-labels';

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

function isApiFormError(error: unknown): error is ApiFormError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiFormError).message === 'string'
  );
}

function sectionShellClass(): string {
  return 'starium-form-section space-y-3 border-border/60';
}

function sectionTitleClass(): string {
  return 'starium-form-section-title';
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
  const { user } = useAuth();
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
  const formErrorRef = useRef<HTMLDivElement | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [adaptationReason, setAdaptationReason] = useState('');
  const [adaptationDialogOpen, setAdaptationDialogOpen] = useState(false);
  const [adaptationEditEnabled, setAdaptationEditEnabled] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitValidatorUserId, setSubmitValidatorUserId] = useState('');
  const [createDirectionOpen, setCreateDirectionOpen] = useState(false);
  const [ownerResourceId, setOwnerResourceId] = useState<string>('');
  const [selectedAxisIds, setSelectedAxisIds] = useState<string[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [extraDirectionOptions, setExtraDirectionOptions] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);

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

  const directionOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; code: string }>();
    for (const direction of directionsQ.data ?? []) {
      byId.set(direction.id, direction);
    }
    for (const direction of extraDirectionOptions) {
      byId.set(direction.id, direction);
    }
    const rel = selectedStrategy?.direction;
    if (rel?.name) {
      byId.set(rel.id, { id: rel.id, name: rel.name, code: rel.code });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [directionsQ.data, extraDirectionOptions, selectedStrategy?.direction]);

  const directionById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const direction of directionOptions) map.set(direction.id, direction);
    return map;
  }, [directionOptions]);

  const visionOptions = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; title: string; horizonLabel: string; isActive?: boolean }
    >();
    for (const vision of visionsQ.data ?? []) {
      byId.set(vision.id, vision);
    }
    const rel = selectedStrategy?.alignedVision;
    if (rel?.title) {
      byId.set(rel.id, {
        id: rel.id,
        title: rel.title,
        horizonLabel: rel.horizonLabel,
        isActive: rel.isActive,
      });
    }
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }, [visionsQ.data, selectedStrategy?.alignedVision]);

  const visionById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; horizonLabel: string }>();
    for (const vision of visionOptions) {
      map.set(vision.id, vision);
    }
    return map;
  }, [visionOptions]);

  const formatDirectionLabel = (direction: { name: string; code: string }) =>
    `${direction.name} (${direction.code})`;

  const selectedDirectionLabel = directionId
    ? directionById.get(directionId)
    : null;

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

  const workflowSettingsQ = useStrategicDirectionStrategyWorkflowSettingsQuery({
    enabled: canRead,
  });
  const allowSubmitterToPickValidator =
    workflowSettingsQ.data?.resolved.allowSubmitterToSelectValidator !== false;
  const defaultValidatorSummary = workflowSettingsQ.data?.options.eligibleValidators.find(
    (candidate) => candidate.id === workflowSettingsQ.data?.resolved.defaultValidatorUserId,
  );
  const validatorOptionsQ = useStrategicDirectionStrategyValidatorOptionsQuery({
    enabled: canUpdate && allowSubmitterToPickValidator,
  });

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

  const canDecideOnStrategy =
    canReview &&
    Boolean(selectedStrategy) &&
    status === 'SUBMITTED' &&
    user?.id != null &&
    user.id !== selectedStrategy?.submittedByUserId &&
    (!selectedStrategy?.validatorUserId || selectedStrategy.validatorUserId === user.id);

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

  const alignmentDirectionLabel = useMemo(() => {
    if (!directionId) return null;
    const direction = directionById.get(directionId);
    return direction ? formatDirectionLabel(direction) : null;
  }, [directionId, directionById]);

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

  const reportFormError = useCallback((message: string) => {
    setFormError(message);
    requestAnimationFrame(() => {
      formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    if (!selectedStrategy) return;
    if (allowSubmitterToPickValidator && !submitValidatorUserId) {
      reportFormError('Sélectionnez un validateur avant la soumission.');
      return;
    }
    setFormError('');
    try {
      await submitMutation.mutateAsync({
        strategyId: selectedStrategy.id,
        alignedVisionId: selectedStrategy.alignedVisionId,
        validatorUserId: allowSubmitterToPickValidator ? submitValidatorUserId : undefined,
      });
      setSubmitDialogOpen(false);
      setSubmitValidatorUserId('');
      toast.success('Stratégie soumise pour validation.');
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Soumission impossible.';
      reportFormError(message);
    }
  }, [
    allowSubmitterToPickValidator,
    reportFormError,
    selectedStrategy,
    submitMutation,
    submitValidatorUserId,
  ]);

  const handleSaveStrategy = useCallback(async () => {
    setFormError('');
    const strategicPriorities = toStrategicPrioritiesPayload(priorityRows);
    const expectedOutcomes = toExpectedOutcomesPayload(outcomeRows);
    const kpisPayload = toKpisPayload(kpiRows);
    const majorInitiatives = toMajorInitiativesPayload(initiativeRows);
    const risks = toRisksPayload(riskRows);
    const resolvedHorizon =
      horizonLabel.trim() || alignedVisionMeta.horizonLabel.trim() || '';

    if (!directionId || !alignedVisionId || !title.trim() || !ambition.trim() || !context.trim()) {
      reportFormError('Direction, vision, titre, ambition et contexte sont requis.');
      return;
    }
    if (!resolvedHorizon) {
      reportFormError('L’horizon est requis (saisie ou vision alignée).');
      return;
    }
    if (
      !isCreating &&
      selectedStrategy?.status === 'APPROVED' &&
      approvedAdaptationMode &&
      adaptationReason.trim().length === 0
    ) {
      reportFormError('Le motif d’adaptation est requis pour modifier une stratégie validée.');
      return;
    }

    const strategyBody = {
      alignedVisionId,
      title: title.trim(),
      ambition: ambition.trim(),
      context: context.trim(),
      strategicPriorities,
      expectedOutcomes,
      kpis: kpisPayload,
      majorInitiatives,
      risks,
      horizonLabel: resolvedHorizon,
      ownerLabel: ownerLabel.trim() || undefined,
      archiveReason:
        selectedStrategy?.status === 'APPROVED' && approvedAdaptationMode
          ? adaptationReason.trim()
          : undefined,
    };

    try {
      if (isCreating && canCreate) {
        const axisIdsSnapshot = [...selectedAxisIds];
        const objectiveIdsSnapshot = [...selectedObjectiveIds];
        const created = await createMutation.mutateAsync({
          directionId,
          alignedVisionId,
          title: title.trim(),
          ambition: ambition.trim(),
          context: context.trim(),
          strategicPriorities,
          expectedOutcomes,
          kpis: kpisPayload,
          majorInitiatives,
          risks,
          horizonLabel: resolvedHorizon,
          ownerLabel: ownerLabel.trim() || undefined,
        });
        setIsCreating(false);
        setSelectedStrategyId(created.id);
        if (canUpdate) {
          await replaceAxesMutation.mutateAsync({
            strategyId: created.id,
            strategicAxisIds: axisIdsSnapshot,
          });
          await replaceObjectivesMutation.mutateAsync({
            strategyId: created.id,
            strategicObjectiveIds: objectiveIdsSnapshot,
          });
        }
        toast.success('Brouillon créé.');
        return;
      }

      if (!selectedStrategy) return;

      await updateMutation.mutateAsync({
        strategyId: selectedStrategy.id,
        body: strategyBody,
      });

      if (canEditLinks && visionAlignedWithServer) {
        await replaceAxesMutation.mutateAsync({
          strategyId: selectedStrategy.id,
          strategicAxisIds: selectedAxisIds,
        });
        await replaceObjectivesMutation.mutateAsync({
          strategyId: selectedStrategy.id,
          strategicObjectiveIds: selectedObjectiveIds,
        });
      }

      if (approvedAdaptationMode) {
        setAdaptationEditEnabled(false);
        setAdaptationReason('');
      }

      toast.success('Stratégie enregistrée.');
    } catch (error) {
      const message = isApiFormError(error)
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Enregistrement impossible — vérifie les champs ou les permissions.';
      reportFormError(message);
      toast.error(message);
    }
  }, [
    priorityRows,
    outcomeRows,
    kpiRows,
    initiativeRows,
    riskRows,
    horizonLabel,
    alignedVisionMeta.horizonLabel,
    directionId,
    alignedVisionId,
    title,
    ambition,
    context,
    isCreating,
    selectedStrategy,
    approvedAdaptationMode,
    adaptationReason,
    ownerLabel,
    canCreate,
    createMutation,
    replaceAxesMutation,
    replaceObjectivesMutation,
    canUpdate,
    updateMutation,
    canEditLinks,
    visionAlignedWithServer,
    selectedAxisIds,
    selectedObjectiveIds,
    reportFormError,
  ]);

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
        description="Liste, création et mise à jour des stratégies par direction — soumission et validation."
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
                {STRATEGIC_DIRECTION_STRATEGY_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
            onPointerDown={tablePan.onPointerDown}
            className={cn(
              'min-h-0 flex-1 overflow-auto',
              tablePan.isPanning ? 'cursor-grabbing select-none touch-none' : 'cursor-grab',
            )}
          >
            <Table className="min-w-[52rem] w-full text-sm">
              <TableHeader className="sticky top-0 z-[1] border-b border-border/60 bg-muted/90 backdrop-blur">
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground">Direction</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Titre</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Vision</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Statut</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">MAJ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(strategiesQ.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-10 text-center text-muted-foreground">
                      Aucune stratégie pour ces filtres. Réinitialise les filtres ou crée une stratégie.
                    </TableCell>
                  </TableRow>
                ) : (
                  (strategiesQ.data ?? []).map((strategy) => (
                    <TableRow
                      key={strategy.id}
                      className={cn(
                        'cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/30',
                        selectedStrategyId === strategy.id && !isCreating ? 'bg-muted/40' : '',
                      )}
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedStrategyId(strategy.id);
                        setFormError('');
                      }}
                    >
                      <TableCell className="align-top">{directionLabel(strategy)}</TableCell>
                      <TableCell className="align-top font-medium">{strategy.title ?? 'Sans titre'}</TableCell>
                      <TableCell className="align-top text-muted-foreground">{visionTitleCell(strategy)}</TableCell>
                      <TableCell className="align-top">
                        {getStrategicDirectionStrategyStatusLabel(strategy.status)}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {new Date(strategy.updatedAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
              <em> validées</em> et <em>archivées</em> s’affichent en lecture seule sous la liste.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <StariumModal
        open={showFormPanel}
        onOpenChange={(open) => {
          if (open) return;
          closePanel();
        }}
        title={isCreating ? 'Nouvelle stratégie' : selectedStrategy?.title ?? 'Stratégie'}
        description={
          isCreating
            ? 'Direction, vision alignée, puis contenu — enregistre pour créer le brouillon.'
            : `Statut : ${getStrategicDirectionStrategyStatusLabel(status)}${selectedStrategy ? ` · ${directionLabel(selectedStrategy)}` : ''}`
        }
        status={
          !isCreating && selectedStrategy ? (
            <Badge variant="outline" className="shrink-0 px-2.5 py-1 text-xs font-medium">
              {getStrategicDirectionStrategyStatusLabel(status)}
            </Badge>
          ) : undefined
        }
        size="full"
        contentClassName="flex min-h-0 max-h-[min(92dvh,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden sm:max-w-6xl"
      >
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
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 py-4">
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

                <section className={sectionShellClass()} aria-labelledby="strategy-synthesis">
                  <h3 id="strategy-synthesis" className={sectionTitleClass()}>
                    <Compass aria-hidden />
                    Synthèse
                  </h3>
                  <div className="starium-form-field">
                    <Label htmlFor="strategy-direction" className="starium-form-label">
                      Direction
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={directionId}
                        onValueChange={(value) => {
                          if (value != null) setDirectionId(value);
                        }}
                        disabled={!canEditFields || (!isCreating && Boolean(selectedStrategy))}
                      >
                        <SelectTrigger
                          id="strategy-direction"
                          className="starium-form-input h-9 w-full min-w-0"
                          aria-label="Direction"
                        >
                          <SelectValue placeholder="Choisir une direction">
                            {selectedDirectionLabel
                              ? formatDirectionLabel(selectedDirectionLabel)
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {directionOptions.map((direction) => (
                            <SelectItem key={direction.id} value={direction.id}>
                              {formatDirectionLabel(direction)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  </div>
                  <div className="starium-form-field">
                    <Label htmlFor="strategy-title" className="starium-form-label">
                      Titre
                    </Label>
                    <Input
                      id="strategy-title"
                      className="starium-form-input"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Titre de la stratégie"
                      disabled={!canEditFields}
                    />
                  </div>
                  <div className="starium-form-field">
                    <Label htmlFor="strategy-ambition" className="starium-form-label">
                      Ambition
                    </Label>
                    <textarea
                      id="strategy-ambition"
                      value={ambition}
                      onChange={(event) => setAmbition(event.target.value)}
                      className="starium-form-textarea min-h-24 w-full"
                      placeholder="Ambition stratégique de la direction"
                      disabled={!canEditFields}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Statut :{' '}
                    <span className="font-medium text-foreground">
                      {getStrategicDirectionStrategyStatusLabel(status)}
                    </span>
                    {status === 'ARCHIVED' && selectedStrategy?.archivedAt ? (
                      <span className="ml-2 text-muted-foreground">
                        · archivée le {new Date(selectedStrategy.archivedAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : null}
                  </p>
                  {selectedStrategy && status === 'APPROVED' && !approvedAdaptationMode ? (
                    <Alert>
                      <AlertDescription>
                        Cette version validée est verrouillée. Utilise{' '}
                        <strong>Adapter cette stratégie</strong> pour ouvrir une session d’édition avec archivage
                        automatique de la version validée.
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
                    setExtraDirectionOptions((prev) => {
                      if (prev.some((direction) => direction.id === created.id)) return prev;
                      return [...prev, { id: created.id, name: created.name, code: created.code }];
                    });
                    setDirectionId(created.id);
                    setCreateDirectionOpen(false);
                  }}
                />

                <StrategicDirectionStrategyAlignmentSection
                  directionLabel={alignmentDirectionLabel}
                  alignedVisionId={alignedVisionId}
                  onAlignedVisionChange={setAlignedVisionId}
                  visions={visionOptions}
                  alignedVisionMeta={alignedVisionMeta}
                  canEditFields={canEditFields}
                  isCreating={isCreating}
                  canCreate={canCreate}
                  canUpdate={canUpdate}
                  visionAlignedWithServer={visionAlignedWithServer}
                  showAlignmentWorkbench={showAlignmentWorkbench}
                  alignmentEditOpen={alignmentEditOpen}
                  pickAlignmentEnabled={pickAlignmentEnabled}
                  alignmentCreateOpen={alignmentCreateOpen}
                  linksLoading={linksQ.isLoading}
                  linksError={linksQ.isError}
                  axesForVision={axesForVision}
                  objectivesEligible={objectivesEligible}
                  selectedAxisIds={selectedAxisIds}
                  selectedObjectiveIds={selectedObjectiveIds}
                  onToggleAxis={toggleLinkedAxis}
                  onToggleObjective={toggleLinkedObjective}
                  getAxisPresentation={getAxisPresentation}
                  objectiveStatusLabel={objectiveStatusLabel}
                  isPersistedStrategy={!isCreating}
                  selectedStrategyId={selectedStrategyId}
                  onSaveAxes={() => {
                    if (!selectedStrategyId) return;
                    replaceAxesMutation.mutate({
                      strategyId: selectedStrategyId,
                      strategicAxisIds: selectedAxisIds,
                    });
                  }}
                  onSaveObjectives={() => {
                    if (!selectedStrategyId) return;
                    replaceObjectivesMutation.mutate({
                      strategyId: selectedStrategyId,
                      strategicObjectiveIds: selectedObjectiveIds,
                    });
                  }}
                  axesSavePending={replaceAxesMutation.isPending}
                  objectivesSavePending={replaceObjectivesMutation.isPending}
                  readOnlyLinks={
                    alignmentEditOpen && !pickAlignmentEnabled && linksQ.data ? linksQ.data : null
                  }
                />

                <section className={sectionShellClass()} aria-labelledby="strategy-frame">
                  <h3 id="strategy-frame" className={sectionTitleClass()}>
                    <FileText aria-hidden />
                    Cadre
                  </h3>
                  <div className="starium-form-field">
                    <Label htmlFor="strategy-context" className="starium-form-label">
                      Contexte
                    </Label>
                    <textarea
                      id="strategy-context"
                      value={context}
                      onChange={(event) => setContext(event.target.value)}
                      className="starium-form-textarea min-h-24 w-full"
                      placeholder="Contexte et enjeux"
                      disabled={!canEditFields}
                    />
                  </div>
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
                  <h3 className="text-sm font-semibold text-foreground">
                    {STRATEGIC_DIRECTION_STRATEGY_VALIDATION_SECTION_TITLE}
                  </h3>

                  {status === 'SUBMITTED' && selectedStrategy?.validatorSummary ? (
                    <p className="text-sm text-muted-foreground">
                      Validateur désigné :{' '}
                      <span className="font-medium text-foreground">
                        {selectedStrategy.validatorSummary.displayName}
                      </span>
                    </p>
                  ) : null}

                  {!allowSubmitterToPickValidator &&
                  (status === 'DRAFT' || status === 'REJECTED') &&
                  defaultValidatorSummary ? (
                    <p className="text-sm text-muted-foreground">
                      À la soumission, la validation sera demandée à{' '}
                      <span className="font-medium text-foreground">
                        {defaultValidatorSummary.displayName}
                      </span>{' '}
                      (paramétrage module).
                    </p>
                  ) : null}

                  {(status === 'SUBMITTED' || status === 'REJECTED') && selectedStrategy ? (
                    <label className="space-y-1 text-sm">
                      <span className="text-muted-foreground">Motif de refus (requis pour refuser)</span>
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Préciser les ajustements attendus…"
                        disabled={!canReview || status !== 'SUBMITTED' || !canDecideOnStrategy}
                      />
                    </label>
                  ) : null}

                  {formError ? (
                    <div ref={formErrorRef} className="scroll-mt-4" tabIndex={-1}>
                      <Alert variant="destructive" role="alert" aria-live="assertive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    </div>
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
                        disabled={
                          createMutation.isPending ||
                          updateMutation.isPending ||
                          replaceAxesMutation.isPending ||
                          replaceObjectivesMutation.isPending
                        }
                        onClick={() => {
                          void handleSaveStrategy();
                        }}
                      >
                        {createMutation.isPending ||
                        updateMutation.isPending ||
                        replaceAxesMutation.isPending ||
                        replaceObjectivesMutation.isPending
                          ? 'Enregistrement…'
                          : isCreating
                            ? 'Créer le brouillon'
                            : 'Enregistrer'}
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
                            ? 'Enregistre la stratégie après changement de vision avant la soumission pour validation.'
                            : undefined
                        }
                        onClick={() => {
                          setFormError('');
                          if (allowSubmitterToPickValidator) {
                            setSubmitValidatorUserId('');
                            setSubmitDialogOpen(true);
                            return;
                          }
                          void handleConfirmSubmit();
                        }}
                      >
                        {STRATEGIC_DIRECTION_STRATEGY_SUBMIT_LABEL}
                      </Button>
                    ) : null}

                    {canDecideOnStrategy && selectedStrategy ? (
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
                          {STRATEGIC_DIRECTION_STRATEGY_APPROVE_LABEL}
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
                          {STRATEGIC_DIRECTION_STRATEGY_REJECT_LABEL}
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
                        {archiveMutation.isPending ? 'Archivage…' : 'Archiver cette version validée'}
                      </Button>
                    ) : null}
                  </div>
                </section>

              </div>
            </div>
          )}
      </StariumModal>

      <StariumModal
        open={submitDialogOpen}
        onOpenChange={(open) => {
          setSubmitDialogOpen(open);
          if (!open) {
            setSubmitValidatorUserId('');
          }
        }}
        title="Soumettre pour validation"
        description="Choisis la personne qui validera cette stratégie. Tu ne pourras pas valider ta propre soumission."
        showCloseButton={!submitMutation.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={submitMutation.isPending}
              onClick={() => setSubmitDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={
                submitMutation.isPending ||
                validatorOptionsQ.isLoading ||
                (allowSubmitterToPickValidator && !submitValidatorUserId)
              }
              onClick={() => void handleConfirmSubmit()}
            >
              {submitMutation.isPending ? 'Soumission…' : STRATEGIC_DIRECTION_STRATEGY_SUBMIT_LABEL}
            </Button>
          </>
        }
      >

          <div className="starium-form-field">
            <Label htmlFor="strategy-submit-validator" className="starium-form-label">
              Validateur
            </Label>
            {validatorOptionsQ.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            ) : (validatorOptionsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun validateur disponible. Configure les options du module ou les permissions de
                revue.
              </p>
            ) : (
              <Select
                value={submitValidatorUserId}
                onValueChange={(value) => setSubmitValidatorUserId(value ?? '')}
              >
                <SelectTrigger id="strategy-submit-validator" className="w-full">
                  <SelectValue placeholder="Choisir un validateur" />
                </SelectTrigger>
                <SelectContent>
                  {(validatorOptionsQ.data ?? []).map((validator) => (
                    <SelectItem key={validator.id} value={validator.id}>
                      {validator.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {formError && submitDialogOpen ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
      </StariumModal>

      <StariumModal
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archiver la stratégie validée"
        description={`La stratégie passera en lecture seule (${STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS.ARCHIVED}) et un nouveau cycle pourra être créé pour la même direction et vision. Renseigne le motif d’archivage.`}
        showCloseButton={!archiveMutation.isPending}
        footer={
          <>
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
          </>
        }
      >

          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">Motif d’archivage</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder="Ex. Fin de cycle stratégique 2026, lancement d’une nouvelle version…"
              disabled={archiveMutation.isPending}
            />
          </label>
      </StariumModal>

      <StariumModal
        open={adaptationDialogOpen}
        onOpenChange={setAdaptationDialogOpen}
        title="Adapter une stratégie validée"
        description="Cette action ouvre l’édition et déclenchera l’archivage automatique de l’ancienne version validée au moment de l’enregistrement."
        footer={
          <>
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
          </>
        }
      >

          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">Motif d’adaptation</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={adaptationReason}
              onChange={(event) => setAdaptationReason(event.target.value)}
              placeholder="Ex. Nouveau contexte business, évolution du cadrage, arbitrage direction…"
            />
          </label>
      </StariumModal>
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
          {directionLabel} · Statut : {getStrategicDirectionStrategyStatusLabel(strategy.status)}
          {strategy.alignedVision ? ` · Vision : ${strategy.alignedVision.title}` : ''}
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-xs font-medium">
            {getStrategicDirectionStrategyStatusLabel(strategy.status)}
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

        <StrategicDirectionStrategyVersionComparePanel strategyId={strategy.id} />

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
              description="Les alertes opérationnelles ou de gouvernance remontées sur cette stratégie s’afficheront ici — module non connecté pour l’instant."
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
