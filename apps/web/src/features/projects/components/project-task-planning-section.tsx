'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { useProjectTaskBucketsQuery } from '../hooks/use-project-task-buckets-query';
import { createProjectTaskPhase, listProjectTaskPhases } from '../api/projects.api';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTaskLabelsQuery } from '../hooks/use-project-task-labels-query';
import { useProjectMilestoneLabelsQuery } from '../hooks/use-project-milestone-labels-query';
import {
  useCreateProjectTaskMutation,
  useCreateProjectMilestoneMutation,
  useUpdateProjectTaskMutation,
  useUpdateProjectMilestoneMutation,
} from '../hooks/use-project-planning-mutations';
import {
  useCreateProjectMilestoneLabelMutation,
  useCreateProjectTaskLabelMutation,
} from '../hooks/use-project-labels-mutations';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectMicrosoftLinkQuery } from '../options/hooks/use-project-microsoft-link-query';
import { GANTT_ROW_PX } from '../lib/gantt-timeline-layout';
import {
  buildGanttBodyRows,
  type GanttBodyRow,
} from '../lib/build-gantt-body-rows';
import {
  MILESTONE_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import type { ProjectMilestoneApi, ProjectTaskApi } from '../types/project.types';
import type {
  CreateProjectMilestonePayload,
  CreateProjectTaskPayload,
  UpdateProjectMilestonePayload,
  UpdateProjectTaskPayload,
} from '../api/projects.api';
import { cn } from '@/lib/utils';
import { MilestoneFormDialogFields } from './milestone-form-dialog-fields';
import { TaskFormDialogFields } from './task-form-dialog-fields';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from 'sonner';
import {
  pickReadableTextOnBackground,
  resolveTaskLabelDisplayColor,
} from '../lib/planner-task-label-colors';

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function dateInputToIso(s: string): string | undefined {
  if (!s.trim()) return undefined;
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

function taskRowIndentPx(row: ProjectTaskApi, stepPx: number): number {
  const d = (row as ProjectTaskApi & { depth?: number }).depth;
  return (typeof d === 'number' ? d : 0) * stepPx;
}

function emptyCreateForm(): CreateProjectTaskPayload {
  return {
    name: '',
    status: 'TODO',
    priority: 'MEDIUM',
    progress: 0,
    checklistItems: [],
    taskLabelIds: [],
  };
}

function sanitizeChecklistForSubmit(
  items: CreateProjectTaskPayload['checklistItems'],
): NonNullable<UpdateProjectTaskPayload['checklistItems']> {
  if (!items?.length) return [];
  return items
    .map((c, i) => ({
      ...c,
      title: c.title.trim(),
      sortOrder: c.sortOrder ?? i,
    }))
    .filter((c) => c.title.length > 0);
}

function milestoneFormFromApi(m: ProjectMilestoneApi): CreateProjectMilestonePayload {
  return {
    name: m.name,
    description: m.description ?? undefined,
    code: m.code ?? undefined,
    targetDate: m.targetDate,
    achievedDate: m.achievedDate ?? undefined,
    status: m.status,
    linkedTaskId: m.linkedTaskId,
    phaseId: m.phaseId ?? null,
    ownerUserId: m.ownerUserId,
    sortOrder: m.sortOrder,
    milestoneLabelIds: m.milestoneLabelIds ?? [],
  };
}

/** Après édition d’un champ date dans la grille Gantt : cohérence début/fin (API : fin ≥ début). */
function mergePlannedDatesAfterEdit(
  row: Pick<ProjectTaskApi, 'plannedStartDate' | 'plannedEndDate'>,
  field: 'plannedStartDate' | 'plannedEndDate',
  raw: string,
): UpdateProjectTaskPayload {
  const hasValue = raw.trim().length > 0;
  const iso = hasValue ? dateInputToIso(raw) : undefined;

  let nextStart =
    field === 'plannedStartDate' ? (iso ?? null) : (row.plannedStartDate ?? null);
  let nextEnd =
    field === 'plannedEndDate' ? (iso ?? null) : (row.plannedEndDate ?? null);

  if (field === 'plannedStartDate' && !hasValue) nextStart = null;
  if (field === 'plannedEndDate' && !hasValue) nextEnd = null;

  if (!nextStart && !nextEnd) {
    return { plannedStartDate: undefined, plannedEndDate: undefined };
  }
  if (nextStart && !nextEnd) nextEnd = nextStart;
  if (!nextStart && nextEnd) nextStart = nextEnd;

  if (nextStart && nextEnd && new Date(nextEnd) < new Date(nextStart)) {
    if (field === 'plannedStartDate') nextEnd = nextStart;
    else nextStart = nextEnd;
  }

  return {
    plannedStartDate: nextStart ?? undefined,
    plannedEndDate: nextEnd ?? undefined,
  };
}

/** Champs date sidebar Gantt : compacts, alignés sur la hauteur de ligne. */
const ganttDateInputClass = cn(
  'h-6 w-[5.5rem] max-w-[5.75rem] shrink-0 min-w-0 px-1 py-0',
  'text-[10px] leading-none tabular-nums tracking-tight md:text-[10px]',
  'rounded-md border border-border/50 bg-muted/35 shadow-none',
  'transition-[color,background-color,border-color,box-shadow]',
  'hover:border-border/70 hover:bg-muted/50',
  'focus-visible:border-ring focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring/30',
);

export type ProjectTaskPlanningSectionProps = {
  projectId: string;
  variant: 'full-table' | 'gantt-sidebar';
  /** Jalons en fin de liste pour aligner avec la frise Gantt ; clic → édition si `projects.update`. */
  milestoneRows?: { id: string; name: string }[];
  /** Masque la barre « Nouvelle tâche » (ex. Gantt : bouton hors zone scroll via ref). */
  hideToolbar?: boolean;
  /** Filtre statut des lignes tâches (Gantt uniquement), aligné avec la frise. */
  ganttTaskStatusFilter?: 'all' | string;
  /**
   * Lignes d’en-tête sous les colonnes (hauteur = `GANTT_ROW_PX` chacune), pour aligner avec la frise
   * (ex. ligne « jours » affichée au zoom).
   */
  ganttExtraHeaderRows?: number;
  /**
   * Corps Gantt fourni par le parent (même ordre que la frise). Sinon calcul local depuis la liste tâches.
   */
  ganttUnifiedBodyRows?: GanttBodyRow[];
};

export type ProjectTaskPlanningSectionHandle = {
  openCreate: () => void;
};

export const ProjectTaskPlanningSection = forwardRef<
  ProjectTaskPlanningSectionHandle,
  ProjectTaskPlanningSectionProps
>(function ProjectTaskPlanningSection(
  {
    projectId,
    variant,
    milestoneRows = [],
    hideToolbar = false,
    ganttTaskStatusFilter = 'all',
    ganttExtraHeaderRows = 0,
    ganttUnifiedBodyRows: ganttUnifiedBodyRowsProp,
  },
  ref,
) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const canListProjectLabels = has('projects.read') || canEdit;

  const tasksQuery = useProjectTasksQuery(projectId);
  const bucketsQuery = useProjectTaskBucketsQuery(projectId);
  const authFetch = useAuthenticatedFetch();
  const isGanttVariant = variant === 'gantt-sidebar';
  const milestonesQuery = useProjectMilestonesQuery(projectId, {
    enabled: isGanttVariant,
  });
  const assignableQuery = useProjectAssignableUsers({ enabled: canEdit });
  const createMut = useCreateProjectTaskMutation(projectId);
  const createMilestoneMut = useCreateProjectMilestoneMutation(projectId);
  const updateMut = useUpdateProjectTaskMutation(projectId);
  const updateMilestoneMut = useUpdateProjectMilestoneMutation(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTaskApi | null>(null);
  const [tableNameFilter, setTableNameFilter] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | ProjectTaskApi['status']>(
    'all',
  );
  const [tablePriorityFilter, setTablePriorityFilter] = useState<
    'all' | ProjectTaskApi['priority']
  >('all');
  const [tablePhaseFilter, setTablePhaseFilter] = useState<'all' | string>('all');
  const [tableSort, setTableSort] = useState<{
    key: 'name' | 'status' | 'priority' | 'phase' | 'plannedEndDate' | 'progress';
    dir: 'asc' | 'desc';
  }>({ key: 'name', dir: 'asc' });
  const [showPhaseHeaders, setShowPhaseHeaders] = useState(true);
  const [showLabelColumn, setShowLabelColumn] = useState(true);
  const [showPlannedStartColumn, setShowPlannedStartColumn] = useState(false);
  const [activeInlineCell, setActiveInlineCell] = useState<{
    taskId: string;
    field:
      | 'status'
      | 'priority'
      | 'phaseId'
      | 'plannedEndDate'
      | 'progress'
      | 'dependsOnTaskId';
  } | null>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneApi | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<CreateProjectMilestonePayload>({
    name: '',
    targetDate: new Date().toISOString(),
    status: 'PLANNED',
    milestoneLabelIds: [],
    phaseId: null,
  });

  const items = useMemo(
    () => tasksQuery.data?.items ?? [],
    [tasksQuery.data?.items],
  );

  const byId = useMemo(() => new Map(items.map((t) => [t.id, t])), [items]);

  const treeRows = useMemo(() => {
    // Backend trie déjà par phase.sortOrder puis task.sortOrder (et tie-breaks).
    // Ici on ne reconstruit plus une hiérarchie : on ne fait que garantir `depth` pour l'indent visuel.
    return items.map((t) => ({
      ...t,
      parentTaskId: null,
      depth: 0,
    }));
  }, [items]);

  const ganttTreeRows = useMemo(() => {
    if (!isGanttVariant || ganttTaskStatusFilter === 'all') return treeRows;
    return treeRows.filter((r) => r.status === ganttTaskStatusFilter);
  }, [treeRows, isGanttVariant, ganttTaskStatusFilter]);

  const fullTableRows = useMemo(() => {
    if (isGanttVariant) return treeRows;

    const normalizedName = tableNameFilter.trim().toLowerCase();
    let rows = treeRows.filter((r) => {
      if (normalizedName.length > 0 && !r.name.toLowerCase().includes(normalizedName)) {
        return false;
      }
      if (tableStatusFilter !== 'all' && r.status !== tableStatusFilter) return false;
      if (tablePriorityFilter !== 'all' && r.priority !== tablePriorityFilter) return false;
      if (tablePhaseFilter !== 'all' && (r.phaseId ?? '') !== tablePhaseFilter) return false;
      return true;
    });

    const sorted = [...rows].sort((a, b) => {
      const direction = tableSort.dir === 'asc' ? 1 : -1;
      switch (tableSort.key) {
        case 'name':
          return a.name.localeCompare(b.name) * direction;
        case 'status':
          return a.status.localeCompare(b.status) * direction;
        case 'priority':
          return a.priority.localeCompare(b.priority) * direction;
        case 'phase':
          return (a.phaseId ?? '').localeCompare(b.phaseId ?? '') * direction;
        case 'plannedEndDate': {
          const ad = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : 0;
          const bd = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : 0;
          return (ad - bd) * direction;
        }
        case 'progress':
          return (a.progress - b.progress) * direction;
        default:
          return 0;
      }
    });
    rows = sorted;
    return rows;
  }, [
    isGanttVariant,
    treeRows,
    tableNameFilter,
    tableStatusFilter,
    tablePriorityFilter,
    tablePhaseFilter,
    tableSort,
  ]);

  const isGantt = isGanttVariant;
  /** Même source que la grille / table visible (après filtre/tri). */
  const displayedRows = isGantt ? ganttTreeRows : fullTableRows;

  const isTaskUpdatePending = useCallback(
    (taskId: string) =>
      updateMut.isPending && updateMut.variables?.taskId === taskId,
    [updateMut.isPending, updateMut.variables?.taskId],
  );

  const renderSortIndicator = useCallback(
    (key: 'name' | 'status' | 'priority' | 'phase' | 'plannedEndDate' | 'progress') => {
      if (tableSort.key !== key) return <span className="text-muted-foreground/60 ml-1">↕</span>;
      return (
        <span className="text-primary ml-1" aria-hidden>
          {tableSort.dir === 'asc' ? '▲' : '▼'}
        </span>
      );
    },
    [tableSort],
  );

  const assignableOptions = useMemo(
    () =>
      (assignableQuery.data?.users ?? []).map((u) => ({
        id: u.id,
        label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      })),
    [assignableQuery.data?.users],
  );

  const bucketOptions = useMemo(
    () =>
      (bucketsQuery.data?.items ?? []).map((b) => ({
        id: b.id,
        label: b.name,
      })),
    [bucketsQuery.data?.items],
  );

  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const syncMicrosoftPlannerLabelsEnabled = linkQuery.data?.useMicrosoftPlannerLabels ?? false;

  const taskLabelsQuery = useProjectTaskLabelsQuery(projectId, canListProjectLabels);
  const milestoneLabelsQuery = useProjectMilestoneLabelsQuery(
    projectId,
    canListProjectLabels,
  );

  const taskLabelOptions = useMemo(
    () =>
      (taskLabelsQuery.data ?? []).map((l) => ({
        id: l.id,
        label: l.name,
        color: l.color,
        plannerCategoryId: l.plannerCategoryId,
      })),
    [taskLabelsQuery.data],
  );

  const milestoneLabelOptions = useMemo(
    () =>
      (milestoneLabelsQuery.data ?? []).map((l) => ({
        id: l.id,
        label: l.name,
      })),
    [milestoneLabelsQuery.data],
  );

  const canCreateTaskLabels = canEdit && !syncMicrosoftPlannerLabelsEnabled;
  const canCreateMilestoneLabels = canEdit;

  const createTaskLabelMut = useCreateProjectTaskLabelMutation(projectId);
  const createMilestoneLabelMut = useCreateProjectMilestoneLabelMutation(projectId);

  const onCreateTaskLabel = async (name: string) => {
    const created = await createTaskLabelMut.mutateAsync({ name });
    return created.id;
  };

  const onCreateMilestoneLabel = async (name: string) => {
    const created = await createMilestoneLabelMut.mutateAsync({ name });
    return created.id;
  };

  const [createForm, setCreateForm] = useState<CreateProjectTaskPayload>(emptyCreateForm);

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreateForm(emptyCreateForm());
    setDialogOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openCreate }), [openCreate]);

  const milestoneItems = useMemo(
    () => milestonesQuery.data?.items ?? [],
    [milestonesQuery.data?.items],
  );
  const visibleMilestoneItems = useMemo(() => {
    if (!isGanttVariant) return milestoneItems;
    if (!milestoneRows.length) return [];
    const allowed = new Set(milestoneRows.map((m) => m.id));
    return milestoneItems.filter((m) => allowed.has(m.id));
  }, [isGanttVariant, milestoneItems, milestoneRows]);

  const openMilestoneEdit = useCallback(
    (milestoneId: string) => {
      const m = milestoneItems.find((x) => x.id === milestoneId);
      if (!m) return;
      setEditingMilestone(m);
      setMilestoneForm(milestoneFormFromApi(m));
      setMilestoneDialogOpen(true);
    },
    [milestoneItems],
  );

  const submitMilestone = () => {
    if (!milestoneForm.name.trim()) return;

    if (editingMilestone) {
      const body: UpdateProjectMilestonePayload = { ...milestoneForm };
      updateMilestoneMut.mutate(
        { milestoneId: editingMilestone.id, body },
        {
          onSuccess: () => {
            void milestonesQuery.refetch();
            setMilestoneDialogOpen(false);
          },
        },
      );
      return;
    }

    createMilestoneMut.mutate(milestoneForm, {
      onSuccess: () => {
        void milestonesQuery.refetch();
        setMilestoneDialogOpen(false);
      },
    });
  };

  const openMilestoneCreate = useCallback(() => {
    setEditingMilestone(null);
    setMilestoneForm({
      name: '',
      targetDate: new Date().toISOString(),
      status: 'PLANNED',
      milestoneLabelIds: [],
      phaseId: null,
    });
    setMilestoneDialogOpen(true);
  }, []);

  const openEdit = (t: ProjectTaskApi) => {
    setEditing(t);
    setCreateForm({
      name: t.name,
      description: t.description ?? undefined,
      code: t.code ?? undefined,
      status: t.status,
      priority: t.priority,
      progress: t.progress,
      plannedStartDate: t.plannedStartDate ?? undefined,
      plannedEndDate: t.plannedEndDate ?? undefined,
      actualStartDate: t.actualStartDate ?? undefined,
      actualEndDate: t.actualEndDate ?? undefined,
      phaseId: t.phaseId,
      dependsOnTaskId: t.dependsOnTaskId,
      dependencyType: t.dependencyType,
      ownerUserId: t.ownerUserId,
      budgetLineId: t.budgetLineId,
      bucketId: t.bucketId ?? undefined,
      sortOrder: t.sortOrder,
      taskLabelIds: t.taskLabelIds ?? [],
      checklistItems: (t.checklistItems ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        isChecked: c.isChecked,
        sortOrder: c.sortOrder,
      })),
    });
    setDialogOpen(true);
  };

  const [phaseOptions, setPhaseOptions] = useState<
    Array<{ id: string; name: string; sortOrder: number }>
  >([]);
  useEffect(() => {
    if (!projectId.trim()) return;
    void listProjectTaskPhases(authFetch, projectId)
      .then((phases) => {
        setPhaseOptions(
          phases.map((p) => ({ id: p.id, name: p.name, sortOrder: p.sortOrder })),
        );
      })
      .catch((error: unknown) => {
        const message =
          error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
            ? error.message
            : 'Impossible de charger les phases.';
        toast.error(message);
      });
  }, [authFetch, projectId]);

  const onCreatePhase = useCallback(
    async (name: string) => {
      if (!projectId.trim()) {
        throw new Error('Projet introuvable.');
      }
      const created = await createProjectTaskPhase(authFetch, projectId, { name });
      setPhaseOptions((prev) =>
        [...prev, { id: created.id, name: created.name, sortOrder: created.sortOrder }].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        ),
      );
      return created.id;
    },
    [authFetch, projectId],
  );

  const quickCreatePhase = useCallback(() => {
    const name = window.prompt('Nom de la nouvelle phase');
    if (!name) return;
    void onCreatePhase(name).catch((error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Création de phase impossible.';
      toast.error(message);
    });
  }, [onCreatePhase]);

  const phaseNameById = useMemo(
    () => new Map(phaseOptions.map((p) => [p.id, p.name] as const)),
    [phaseOptions],
  );

  const renderPhaseLabel = (phaseId: string | null) => {
    if (!phaseId) return 'Sans libellé de phase';
    return phaseNameById.get(phaseId) ?? '—';
  };

  const renderRows = useMemo(() => {
    if (!showPhaseHeaders) {
      return displayedRows.map((row) => ({ kind: 'task' as const, row }));
    }

    const ungKey = '__ungrouped__';

    const tasksByKey = new Map<
      string,
      Array<(typeof displayedRows)[number]>
    >();

    for (const t of displayedRows) {
      const key = t.phaseId ?? ungKey;
      const list = tasksByKey.get(key) ?? [];
      list.push(t);
      tasksByKey.set(key, list);
    }

    const out: Array<
      | { kind: 'phaseHeader'; phaseId: string | null; name: string }
      | { kind: 'task'; row: (typeof displayedRows)[number] }
    > = [];

    for (const phase of phaseOptions) {
      const list = tasksByKey.get(phase.id);
      if (!list || list.length === 0) continue;
      out.push({
        kind: 'phaseHeader',
        phaseId: phase.id,
        name: phase.name,
      });
      for (const row of list) out.push({ kind: 'task', row });
    }

    const ung = tasksByKey.get(ungKey);
    if (ung && ung.length > 0) {
      out.push({
        kind: 'phaseHeader',
        phaseId: null,
        name: 'Sans libellé de phase',
      });
      for (const row of ung) out.push({ kind: 'task', row });
    }

    return out;
  }, [displayedRows, phaseOptions, showPhaseHeaders]);

  const ganttBodyRows = useMemo<GanttBodyRow[]>(() => {
    if (!isGantt) return [];
    return buildGanttBodyRows(phaseOptions, displayedRows, visibleMilestoneItems);
  }, [displayedRows, phaseOptions, visibleMilestoneItems, isGantt]);

  const bodyRows: GanttBodyRow[] = isGantt
    ? (ganttUnifiedBodyRowsProp ?? ganttBodyRows)
    : (renderRows as unknown as GanttBodyRow[]);
  const fullTableColumnCount =
    7 + (showLabelColumn ? 1 : 0) + (showPlannedStartColumn ? 1 : 0);
  const taskLabelById = useMemo(
    () => new Map(taskLabelOptions.map((l) => [l.id, l])),
    [taskLabelOptions],
  );

  const tasksForDepends = useMemo(() => {
    const excl = editing?.id;
    return items
      .filter((t) => t.id !== excl)
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, editing]);

  const submit = () => {
    if (!createForm.name.trim()) return;
    const checklistItems = sanitizeChecklistForSubmit(createForm.checklistItems);
    if (editing) {
      const body: UpdateProjectTaskPayload = { ...createForm, checklistItems };
      updateMut.mutate(
        { taskId: editing.id, body },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMut.mutate(
        { ...createForm, checklistItems },
        {
          onSuccess: () => setDialogOpen(false),
        },
      );
    }
  };

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        isGantt ? cn('min-h-0 flex-1', hideToolbar ? 'gap-0' : 'gap-2') : 'gap-4',
      )}
    >
      {!(isGantt && hideToolbar) && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2',
            isGantt && 'shrink-0',
          )}
        >
          {!isGantt && (
            <p className="text-muted-foreground text-sm">
              Tâches groupées par libellé de phase (dépendances simples).
            </p>
          )}
          {isGantt && (
            <p className="text-muted-foreground max-w-[min(100%,22rem)] text-xs leading-snug">
              Planification : dates modifiables ici (début / fin) et sur la frise ; jalons : date
              cible et statut.
            </p>
          )}
          {canEdit && !hideToolbar && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size={isGantt ? 'sm' : 'default'} onClick={quickCreatePhase}>
                Nouvelle phase
              </Button>
              <Button type="button" size={isGantt ? 'sm' : 'default'} onClick={openMilestoneCreate}>
                Nouveau jalon
              </Button>
              <Button type="button" size={isGantt ? 'sm' : 'default'} onClick={openCreate}>
                Nouvelle tâche
              </Button>
            </div>
          )}
        </div>
      )}

      {tasksQuery.isLoading ? (
        <LoadingState rows={isGantt ? 3 : 4} />
      ) : tasksQuery.isError ? (
        <p className="text-destructive text-sm">Impossible de charger les tâches.</p>
      ) : (isGantt
          ? (ganttUnifiedBodyRowsProp ?? ganttBodyRows).length === 0
          : ganttTreeRows.length === 0 && milestoneRows.length === 0) ? (
        <p className="text-muted-foreground py-4 text-center text-sm">Aucune tâche.</p>
      ) : (
        <>
          {!isGantt && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className={cn(
                  'rounded-md border px-2 py-1',
                  showPhaseHeaders ? 'border-primary/60 text-primary' : 'border-border',
                )}
                onClick={() => setShowPhaseHeaders((v) => !v)}
              >
                {showPhaseHeaders ? 'Masquer les phases' : 'Afficher les phases'}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md border px-2 py-1',
                  showLabelColumn ? 'border-primary/60 text-primary' : 'border-border',
                )}
                onClick={() => setShowLabelColumn((v) => !v)}
              >
                {showLabelColumn ? 'Retirer colonne Étiquette' : 'Ajouter colonne Étiquette'}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md border px-2 py-1',
                  showPlannedStartColumn ? 'border-primary/60 text-primary' : 'border-border',
                )}
                onClick={() => setShowPlannedStartColumn((v) => !v)}
              >
                {showPlannedStartColumn
                  ? 'Retirer colonne Début planifiée'
                  : 'Ajouter colonne Début planifiée'}
              </button>
            </div>
          )}

          <div
            className={cn(
              !isGantt && 'max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border/60',
              /** Scroll horizontal ici (pas sur le &lt;table&gt;) pour ne pas découpler la hauteur des lignes de la frise. */
              isGantt &&
                'bg-card/40 min-h-0 w-full overflow-x-auto rounded-lg border border-border/60',
            )}
          >
          <Table
            noWrapper={isGantt}
            className={
              isGantt
                ? 'text-xs border-collapse border-spacing-0 [&_input[type=date]]:cursor-text [&_input[type=date]]:font-medium [&_td]:box-border [&_th]:box-border'
                : undefined
            }
          >
            <TableHeader
              className={
                isGantt
                  ? 'bg-muted/30 sticky top-0 z-10 [&_tr]:border-border/40'
                  : undefined
              }
            >
              {isGantt ? (
                <>
                  <TableRow className="border-border/40 hover:bg-transparent border-b bg-muted/30">
                    <TableHead
                      colSpan={5}
                      className="text-muted-foreground !h-9 min-h-0 px-2 py-0 text-[10px] font-medium uppercase leading-none tracking-wide"
                    >
                      Planification
                    </TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[5rem] !h-9 px-2 py-0 text-xs leading-none">
                      Tâche / jalon
                    </TableHead>
                    <TableHead className="w-[5.75rem] min-w-[5.25rem] !h-9 px-1 py-0 text-[10px] font-medium leading-none">
                      Début
                    </TableHead>
                    <TableHead className="w-[5.75rem] min-w-[5.25rem] !h-9 px-1 py-0 text-[10px] font-medium leading-none">
                      Fin / cible
                    </TableHead>
                    <TableHead className="min-w-[4.5rem] !h-9 px-2 py-0 text-xs leading-none">
                      Statut
                    </TableHead>
                    <TableHead className="min-w-[8rem] !h-9 px-2 py-0 text-xs leading-none">
                      Phase
                    </TableHead>
                  </TableRow>
                  {ganttExtraHeaderRows > 0 && (
                    <TableRow className="border-border/40 hover:bg-transparent border-b bg-muted/30">
                      <TableHead
                        colSpan={5}
                        className="p-0"
                        style={{ height: GANTT_ROW_PX * ganttExtraHeaderRows }}
                        aria-hidden
                      />
                    </TableRow>
                  )}
                </>
              ) : (
                <>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        className="hover:text-primary inline-flex items-center"
                        onClick={() =>
                          setTableSort((prev) => ({
                            key: 'name',
                            dir: prev.key === 'name' && prev.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                      >
                        Titre
                        {renderSortIndicator('name')}
                      </button>
                    </TableHead>
                    {showLabelColumn && <TableHead>Étiquette</TableHead>}
                    <TableHead>
                      <button
                        type="button"
                        className="hover:text-primary inline-flex items-center"
                        onClick={() =>
                          setTableSort((prev) => ({
                            key: 'status',
                            dir: prev.key === 'status' && prev.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                      >
                        Statut
                        {renderSortIndicator('status')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="hover:text-primary inline-flex items-center"
                        onClick={() =>
                          setTableSort((prev) => ({
                            key: 'priority',
                            dir: prev.key === 'priority' && prev.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                      >
                        Priorité
                        {renderSortIndicator('priority')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="hover:text-primary inline-flex items-center"
                        onClick={() =>
                          setTableSort((prev) => ({
                            key: 'phase',
                            dir: prev.key === 'phase' && prev.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                      >
                        Phase
                        {renderSortIndicator('phase')}
                      </button>
                    </TableHead>
                    {showPlannedStartColumn && <TableHead>Début planifiée</TableHead>}
                    <TableHead>
                      <button
                        type="button"
                        className="hover:text-primary inline-flex items-center"
                        onClick={() =>
                          setTableSort((prev) => ({
                            key: 'plannedEndDate',
                            dir:
                              prev.key === 'plannedEndDate' && prev.dir === 'asc'
                                ? 'desc'
                                : 'asc',
                          }))
                        }
                      >
                        Fin planifiée
                        {renderSortIndicator('plannedEndDate')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="hover:text-primary inline-flex items-center"
                        onClick={() =>
                          setTableSort((prev) => ({
                            key: 'progress',
                            dir: prev.key === 'progress' && prev.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                      >
                        Progression
                        {renderSortIndicator('progress')}
                      </button>
                    </TableHead>
                    <TableHead>Dépend de</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead>
                      <Input
                        value={tableNameFilter}
                        onChange={(e) => setTableNameFilter(e.target.value)}
                        placeholder="Filtrer titre..."
                        className="h-8"
                      />
                    </TableHead>
                    {showLabelColumn && <TableHead />}
                    <TableHead>
                      <select
                        className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                        value={tableStatusFilter}
                        onChange={(e) =>
                          setTableStatusFilter(e.target.value as typeof tableStatusFilter)
                        }
                      >
                        <option value="all">Tous</option>
                        {Object.keys(TASK_STATUS_LABEL).map((k) => (
                          <option key={k} value={k}>
                            {TASK_STATUS_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </TableHead>
                    <TableHead>
                      <select
                        className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                        value={tablePriorityFilter}
                        onChange={(e) =>
                          setTablePriorityFilter(e.target.value as typeof tablePriorityFilter)
                        }
                      >
                        <option value="all">Tous</option>
                        {Object.keys(TASK_PRIORITY_LABEL).map((k) => (
                          <option key={k} value={k}>
                            {TASK_PRIORITY_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </TableHead>
                    <TableHead>
                      <select
                        className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                        value={tablePhaseFilter}
                        onChange={(e) => setTablePhaseFilter(e.target.value)}
                      >
                        <option value="all">Toutes</option>
                        <option value="">Sans libellé de phase</option>
                        {phaseOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </TableHead>
                    {showPlannedStartColumn && <TableHead />}
                    <TableHead />
                    <TableHead />
                    <TableHead />
                  </TableRow>
                </>
              )}
            </TableHeader>
            <TableBody
              className={
                isGantt
                  ? '[&_tr:last-child]:!border-b [&_tr:last-child]:border-border/40'
                  : undefined
              }
            >
              {bodyRows.map((r) => {
                if (r.kind === 'phaseHeader') {
                  return (
                    <TableRow
                      key={`phase-${r.phaseId ?? 'none'}`}
                      className="bg-muted/20 border-border/40"
                      style={isGantt ? { height: GANTT_ROW_PX } : undefined}
                    >
                      <TableCell
                        colSpan={isGantt ? 5 : fullTableColumnCount}
                        className={cn('align-middle', isGantt ? 'py-0 px-2' : 'py-1.5')}
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {r.name}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                }

                if (isGantt) {
                  if (r.kind === 'milestone') {
                    const ms =
                      milestoneItems.find((m) => m.id === r.ms.id) ??
                      (r.ms as ProjectMilestoneApi);
                    const linkedTask =
                      ms.linkedTaskId != null ? byId.get(ms.linkedTaskId) : undefined;
                    return (
                      <TableRow
                        key={`ms-${ms.id}`}
                        className="bg-amber-500/5 text-muted-foreground"
                        style={{ height: GANTT_ROW_PX }}
                      >
                        <TableCell className="px-1.5 py-0 align-middle">
                          {canEdit ? (
                            <button
                              type="button"
                              className="hover:text-primary inline-flex max-w-[11rem] cursor-pointer items-center gap-1 truncate text-left italic"
                              title={`${ms.name} — ouvrir la fiche jalon`}
                              onClick={() => openMilestoneEdit(ms.id)}
                            >
                              <span className="text-amber-600 dark:text-amber-500" aria-hidden>
                                ◆
                              </span>
                              <span>{ms.name}</span>
                            </button>
                          ) : (
                            <span
                              className="inline-flex max-w-[11rem] items-center gap-1 truncate italic"
                              title={ms.name}
                            >
                              <span className="text-amber-600 dark:text-amber-500" aria-hidden>
                                ◆
                              </span>
                              <span>{ms.name}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground/70 px-1.5 py-0 align-middle text-[10px]">
                          —
                        </TableCell>
                        <TableCell className="px-1.5 py-0 align-middle">
                          {canEdit ? (
                            <Input
                              type="date"
                              required
                              className={ganttDateInputClass}
                              value={isoToDateInput(ms.targetDate)}
                              onChange={(e) => {
                                const v = e.target.value.trim();
                                if (!v) return;
                                const iso = dateInputToIso(v);
                                if (!iso) return;
                                updateMilestoneMut.mutate({
                                  milestoneId: ms.id,
                                  body: { targetDate: iso },
                                  silentToast: true,
                                });
                              }}
                            />
                          ) : (
                            <span className="text-muted-foreground tabular-nums italic">
                              {ms
                                ? new Date(ms.targetDate).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })
                                : '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-1.5 py-0 align-middle">
                          {canEdit ? (
                            <select
                              className="border-input bg-background h-7 max-w-[5.75rem] rounded-md border px-1 text-[10px] leading-tight italic"
                              value={ms.status}
                              title={MILESTONE_STATUS_LABEL[ms.status]}
                              onChange={(e) => {
                                updateMilestoneMut.mutate({
                                  milestoneId: ms.id,
                                  body: {
                                    status: e.target.value as ProjectMilestoneApi['status'],
                                  },
                                  silentToast: true,
                                });
                              }}
                            >
                              {Object.keys(MILESTONE_STATUS_LABEL).map((k) => (
                                <option key={k} value={k}>
                                  {MILESTONE_STATUS_LABEL[k]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="truncate italic">
                              {ms ? (MILESTONE_STATUS_LABEL[ms.status] ?? ms.status) : '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-1.5 py-0 align-middle">
                          {ms && canEdit ? (
                            <select
                              className="border-input bg-background h-7 w-full max-w-[10rem] rounded-md border px-1 text-[10px] leading-tight"
                              value={ms.phaseId ?? ''}
                              title="Libellé de phase"
                              onChange={(e) => {
                                const nextPhaseId = e.target.value || null;
                                void (async () => {
                                  try {
                                    await updateMilestoneMut.mutateAsync({
                                      milestoneId: ms.id,
                                      body: { phaseId: nextPhaseId },
                                      silentToast: true,
                                    });
                                    await milestonesQuery.refetch();
                                  } catch {
                                    // mute
                                  }
                                })();
                              }}
                            >
                              <option value="">Sans libellé de phase</option>
                              {phaseOptions.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className="truncate text-muted-foreground"
                              title={ms ? renderPhaseLabel(ms.phaseId) : undefined}
                            >
                              {ms ? renderPhaseLabel(ms.phaseId) : '—'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (r.kind !== 'task') return null;

                  const row = byId.get(r.row.id) ?? r.row;
                  const pred = row.dependsOnTaskId ? byId.get(row.dependsOnTaskId) : undefined;

                  return (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/30"
                      style={{ height: GANTT_ROW_PX }}
                    >
                      <TableCell className="px-1.5 py-0 align-middle">
                        {canEdit ? (
                          <button
                            type="button"
                            className="hover:text-primary inline-block max-w-[11rem] cursor-pointer truncate text-left"
                            style={{ paddingLeft: `${taskRowIndentPx(row, 10)}px` }}
                            title={`${row.name} — ouvrir la fiche`}
                            onClick={() => openEdit(row)}
                          >
                            {row.name}
                          </button>
                        ) : (
                          <span
                            style={{ paddingLeft: `${taskRowIndentPx(row, 10)}px` }}
                            className="inline-block max-w-[11rem] truncate"
                            title={row.name}
                          >
                            {row.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-1.5 py-0 align-middle">
                        {canEdit ? (
                          <Input
                            type="date"
                            className={ganttDateInputClass}
                            value={isoToDateInput(row.plannedStartDate)}
                            onChange={(e) => {
                              const body = mergePlannedDatesAfterEdit(
                                row,
                                'plannedStartDate',
                                e.target.value,
                              );
                              updateMut.mutate({
                                taskId: row.id,
                                body,
                                silentToast: true,
                              });
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground tabular-nums">
                            {row.plannedStartDate
                              ? new Date(row.plannedStartDate).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-1.5 py-0 align-middle">
                        {canEdit ? (
                          <Input
                            type="date"
                            className={ganttDateInputClass}
                            value={isoToDateInput(row.plannedEndDate)}
                            onChange={(e) => {
                              const body = mergePlannedDatesAfterEdit(
                                row,
                                'plannedEndDate',
                                e.target.value,
                              );
                              updateMut.mutate({
                                taskId: row.id,
                                body,
                                silentToast: true,
                              });
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground tabular-nums">
                            {row.plannedEndDate
                              ? new Date(row.plannedEndDate).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-1.5 py-0 align-middle">
                        {canEdit ? (
                          <select
                            className="border-input bg-background h-7 max-w-[5.75rem] rounded-md border px-1 text-[10px] leading-tight"
                            value={row.status}
                            title={TASK_STATUS_LABEL[row.status]}
                            onChange={(e) => {
                              updateMut.mutate({
                                taskId: row.id,
                                body: { status: e.target.value as ProjectTaskApi['status'] },
                                silentToast: true,
                              });
                            }}
                          >
                            {Object.keys(TASK_STATUS_LABEL).map((k) => (
                              <option key={k} value={k}>
                                {TASK_STATUS_LABEL[k]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="truncate" title={TASK_STATUS_LABEL[row.status]}>
                            {TASK_STATUS_LABEL[row.status] ?? row.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-1.5 py-0 align-middle">
                        {canEdit ? (
                          <select
                            className="border-input bg-background h-7 w-full max-w-[10rem] rounded-md border px-1 text-[10px] leading-tight"
                            value={row.phaseId ?? ''}
                            title="Libellé de phase"
                            onChange={(e) => {
                              updateMut.mutate({
                                taskId: row.id,
                                body: { phaseId: e.target.value || null },
                                silentToast: true,
                              });
                            }}
                            disabled={isTaskUpdatePending(row.id)}
                          >
                            <option value="">Sans libellé de phase</option>
                            {phaseOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="truncate"
                            title={renderPhaseLabel(row.phaseId)}
                          >
                            {renderPhaseLabel(row.phaseId)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }

                if (r.kind !== 'task') return null;
                const row = r.row;
                const pred = row.dependsOnTaskId ? byId.get(row.dependsOnTaskId) : undefined;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      {canEdit ? (
                        <button
                          type="button"
                          style={{ paddingLeft: `${taskRowIndentPx(row, 12)}px` }}
                          className="hover:text-primary inline-block max-w-[20rem] cursor-pointer truncate text-left"
                          title={`${row.name} — ouvrir la fiche`}
                          onClick={() => openEdit(row)}
                        >
                          {row.name}
                        </button>
                      ) : (
                        <span
                          style={{ paddingLeft: `${taskRowIndentPx(row, 12)}px` }}
                          className="inline-block"
                        >
                          {row.name}
                        </span>
                      )}
                    </TableCell>
                    {showLabelColumn && (
                      <TableCell className="max-w-[12rem] truncate">
                        {(row.taskLabelIds ?? []).length > 0 ? (
                          (() => {
                            const labels = (row.taskLabelIds ?? [])
                              .map((id) => taskLabelById.get(id))
                              .filter((v): v is NonNullable<typeof v> => Boolean(v));
                            const visible = labels.slice(0, 2);
                            const hiddenCount = Math.max(0, labels.length - visible.length);
                            const collapseAllIntoCounter = labels.length > 2;

                            return (
                              <div className="flex flex-wrap items-center gap-1">
                                {!collapseAllIntoCounter &&
                                  visible.map((label) => {
                                    const bg = resolveTaskLabelDisplayColor(
                                      label.plannerCategoryId ?? null,
                                      label.color ?? null,
                                    );
                                    const fg = pickReadableTextOnBackground(bg);
                                    return (
                                      <Badge
                                        key={label.id}
                                        variant="outline"
                                        className="border-transparent px-2 py-0.5 text-[10px] font-medium"
                                        style={{ backgroundColor: bg, color: fg }}
                                        title={label.label}
                                      >
                                        {label.label}
                                      </Badge>
                                    );
                                  })}
                                {(hiddenCount > 0 || collapseAllIntoCounter) ? (
                                  <TooltipProvider delay={200}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <button
                                            type="button"
                                            className="bg-primary/10 text-primary ring-primary/20 inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[10px] font-semibold ring-1"
                                          />
                                        }
                                      >
                                        {labels.length}
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[20rem] p-2">
                                        <div className="space-y-1">
                                          <p className="text-[11px] font-semibold">
                                            {labels.length} etiquette{labels.length > 1 ? 's' : ''}
                                          </p>
                                          <div className="flex max-w-[18rem] flex-wrap gap-1">
                                            {labels.map((l) => {
                                              const bg = resolveTaskLabelDisplayColor(
                                                l.plannerCategoryId ?? null,
                                                l.color ?? null,
                                              );
                                              const fg = pickReadableTextOnBackground(bg);
                                              return (
                                                <span
                                                  key={`tt-${l.id}`}
                                                  className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                                                  style={{ backgroundColor: bg, color: fg }}
                                                >
                                                  {l.label}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : null}
                              </div>
                            );
                          })()
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {canEdit ? (
                        activeInlineCell?.taskId === row.id &&
                        activeInlineCell.field === 'status' ? (
                          <select
                            autoFocus
                            className="border-input bg-background h-8 w-full max-w-[10rem] rounded-md border px-2 text-xs"
                            value={row.status}
                            onChange={(e) => {
                              updateMut.mutate({
                                taskId: row.id,
                                body: { status: e.target.value as ProjectTaskApi['status'] },
                                silentToast: true,
                              });
                              setActiveInlineCell(null);
                            }}
                            onBlur={() => setActiveInlineCell(null)}
                            disabled={isTaskUpdatePending(row.id)}
                          >
                            {Object.keys(TASK_STATUS_LABEL).map((k) => (
                              <option key={k} value={k}>
                                {TASK_STATUS_LABEL[k]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="hover:bg-muted rounded px-2 py-1 text-left"
                            onClick={() => setActiveInlineCell({ taskId: row.id, field: 'status' })}
                          >
                            {TASK_STATUS_LABEL[row.status] ?? row.status}
                          </button>
                        )
                      ) : (
                        TASK_STATUS_LABEL[row.status] ?? row.status
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        activeInlineCell?.taskId === row.id &&
                        activeInlineCell.field === 'priority' ? (
                          <select
                            autoFocus
                            className="border-input bg-background h-8 w-full max-w-[10rem] rounded-md border px-2 text-xs"
                            value={row.priority}
                            onChange={(e) => {
                              updateMut.mutate({
                                taskId: row.id,
                                body: { priority: e.target.value as ProjectTaskApi['priority'] },
                                silentToast: true,
                              });
                              setActiveInlineCell(null);
                            }}
                            onBlur={() => setActiveInlineCell(null)}
                            disabled={isTaskUpdatePending(row.id)}
                          >
                            {Object.keys(TASK_PRIORITY_LABEL).map((k) => (
                              <option key={k} value={k}>
                                {TASK_PRIORITY_LABEL[k]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="hover:bg-muted rounded px-2 py-1 text-left"
                            onClick={() => setActiveInlineCell({ taskId: row.id, field: 'priority' })}
                          >
                            {TASK_PRIORITY_LABEL[row.priority] ?? row.priority}
                          </button>
                        )
                      ) : (
                        TASK_PRIORITY_LABEL[row.priority] ?? row.priority
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[12rem] truncate">
                      {canEdit ? (
                        activeInlineCell?.taskId === row.id &&
                        activeInlineCell.field === 'phaseId' ? (
                          <select
                            autoFocus
                            className="border-input bg-background h-7 w-full max-w-[12rem] rounded-md border px-1 text-[10px] leading-tight"
                            value={row.phaseId ?? ''}
                            title="Libellé de phase"
                            onChange={(e) => {
                              updateMut.mutate({
                                taskId: row.id,
                                body: { phaseId: e.target.value || null },
                                silentToast: true,
                              });
                              setActiveInlineCell(null);
                            }}
                            onBlur={() => setActiveInlineCell(null)}
                            disabled={isTaskUpdatePending(row.id)}
                          >
                            <option value="">Sans libellé de phase</option>
                            {phaseOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="hover:bg-muted rounded px-2 py-1 text-left"
                            onClick={() => setActiveInlineCell({ taskId: row.id, field: 'phaseId' })}
                          >
                            {renderPhaseLabel(row.phaseId)}
                          </button>
                        )
                      ) : (
                        <span>{renderPhaseLabel(row.phaseId)}</span>
                      )}
                    </TableCell>
                    {showPlannedStartColumn && (
                      <TableCell>
                        {row.plannedStartDate
                          ? new Date(row.plannedStartDate).toLocaleDateString('fr-FR')
                          : '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      {canEdit ? (
                        activeInlineCell?.taskId === row.id &&
                        activeInlineCell.field === 'plannedEndDate' ? (
                          <Input
                            autoFocus
                            type="date"
                            className="h-8 w-[10.5rem]"
                            value={isoToDateInput(row.plannedEndDate)}
                            onChange={(e) => {
                              const body = mergePlannedDatesAfterEdit(
                                row,
                                'plannedEndDate',
                                e.target.value,
                              );
                              updateMut.mutate({
                                taskId: row.id,
                                body,
                                silentToast: true,
                              });
                              setActiveInlineCell(null);
                            }}
                            onBlur={() => setActiveInlineCell(null)}
                            disabled={isTaskUpdatePending(row.id)}
                          />
                        ) : (
                          <button
                            type="button"
                            className="hover:bg-muted rounded px-2 py-1 text-left"
                            onClick={() =>
                              setActiveInlineCell({ taskId: row.id, field: 'plannedEndDate' })
                            }
                          >
                            {row.plannedEndDate
                              ? new Date(row.plannedEndDate).toLocaleDateString('fr-FR')
                              : '—'}
                          </button>
                        )
                      ) : row.plannedEndDate ? (
                        new Date(row.plannedEndDate).toLocaleDateString('fr-FR')
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        activeInlineCell?.taskId === row.id &&
                        activeInlineCell.field === 'progress' ? (
                          <Input
                            autoFocus
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={row.progress}
                            className="h-8 w-[6.5rem]"
                            onBlur={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isFinite(n)) {
                                setActiveInlineCell(null);
                                return;
                              }
                              const nextProgress = Math.max(0, Math.min(100, Math.round(n)));
                              if (nextProgress !== row.progress) {
                                updateMut.mutate({
                                  taskId: row.id,
                                  body: { progress: nextProgress },
                                  silentToast: true,
                                });
                              }
                              setActiveInlineCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                              if (e.key === 'Escape') {
                                setActiveInlineCell(null);
                              }
                            }}
                            disabled={isTaskUpdatePending(row.id)}
                          />
                        ) : (
                          <button
                            type="button"
                            className="hover:bg-muted rounded px-2 py-1 text-left"
                            onClick={() => setActiveInlineCell({ taskId: row.id, field: 'progress' })}
                          >
                            {row.progress} %
                          </button>
                        )
                      ) : (
                        `${row.progress} %`
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate">
                      {canEdit ? (
                        activeInlineCell?.taskId === row.id &&
                        activeInlineCell.field === 'dependsOnTaskId' ? (
                          <select
                            autoFocus
                            className="border-input bg-background h-8 w-full max-w-[12rem] rounded-md border px-2 text-xs"
                            value={row.dependsOnTaskId ?? ''}
                            onChange={(e) => {
                              const next = e.target.value || null;
                              updateMut.mutate({
                                taskId: row.id,
                                body: { dependsOnTaskId: next },
                                silentToast: true,
                              });
                              setActiveInlineCell(null);
                            }}
                            onBlur={() => setActiveInlineCell(null)}
                            disabled={isTaskUpdatePending(row.id)}
                          >
                            <option value="">—</option>
                            {tasksForDepends.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="hover:bg-muted rounded px-2 py-1 text-left"
                            onClick={() =>
                              setActiveInlineCell({ taskId: row.id, field: 'dependsOnTaskId' })
                            }
                          >
                            {pred ? pred.name : '—'}
                          </button>
                        )
                      ) : (
                        <>{pred ? pred.name : '—'}</>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-[min(80vw,72rem)] sm:max-w-[min(80vw,72rem)]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Mettre à jour les informations de la tâche, le planning et les dépendances.'
                : 'Créer une nouvelle tâche dans le planning du projet.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(65vh,520px)] overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <TaskFormDialogFields
              form={createForm}
              onPatch={(patch) =>
                setCreateForm((prev) => ({
                  ...prev,
                  ...patch,
                }))
              }
              phaseOptions={phaseOptions}
              tasksForDepends={tasksForDepends}
              assignableOptions={assignableOptions}
              bucketOptions={bucketOptions}
              taskLabelOptions={taskLabelOptions}
              syncMicrosoftPlannerLabelsEnabled={syncMicrosoftPlannerLabelsEnabled}
              canCreateTaskLabels={canCreateTaskLabels}
              onCreateTaskLabel={onCreateTaskLabel}
              canCreatePhase={canEdit}
              onCreatePhase={onCreatePhase}
              fieldIdPrefix="planning-task"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={
                !createForm.name.trim() || createMut.isPending || updateMut.isPending
              }
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editingMilestone ? 'Modifier le jalon' : 'Nouveau jalon'}</DialogTitle>
            <DialogDescription>
              {editingMilestone
                ? 'Mettre à jour le repère temporel et, si besoin, la liaison avec une tâche du projet.'
                : 'Créer un nouveau jalon pour le projet.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,440px)] overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <MilestoneFormDialogFields
              form={milestoneForm}
              onPatch={(p) =>
                setMilestoneForm((prev) => ({
                  ...prev,
                  ...p,
                }))
              }
              phaseOptions={phaseOptions}
              milestoneLabelOptions={milestoneLabelOptions}
              canCreateMilestoneLabels={canCreateMilestoneLabels}
              onCreateMilestoneLabel={onCreateMilestoneLabel}
              fieldIdPrefix="gantt-ms"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMilestoneDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submitMilestone}
              disabled={
                !milestoneForm.name.trim() ||
                createMilestoneMut.isPending ||
                updateMilestoneMut.isPending ||
                milestonesQuery.isLoading
              }
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ProjectTaskPlanningSection.displayName = 'ProjectTaskPlanningSection';
