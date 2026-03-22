'use client';

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import {
  useCreateProjectTaskMutation,
  useUpdateProjectTaskMutation,
  useUpdateProjectMilestoneMutation,
} from '../hooks/use-project-planning-mutations';
import { buildProjectTaskTreeRows } from '../lib/project-task-tree';
import { GANTT_ROW_PX } from '../lib/gantt-timeline-layout';
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

const DEP_TYPES = [
  { value: '', label: '—' },
  { value: 'FINISH_TO_START', label: 'Fin → début' },
  { value: 'START_TO_START', label: 'Début → début' },
  { value: 'FINISH_TO_FINISH', label: 'Fin → fin' },
];

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

function TaskFormFields({
  form,
  setForm,
  tasksForParent,
  tasksForDepends,
  assignableOptions,
}: {
  form: CreateProjectTaskPayload;
  setForm: (f: CreateProjectTaskPayload) => void;
  tasksForParent: { id: string; name: string }[];
  tasksForDepends: { id: string; name: string }[];
  assignableOptions: { id: string; label: string }[];
}) {
  return (
    <div className="grid max-h-[min(70vh,480px)] gap-3 overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label htmlFor="task-name">Nom</Label>
        <Input
          id="task-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Description</Label>
        <textarea
          id="task-desc"
          className="border-input bg-background min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm"
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <select
            className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
            value={form.status ?? 'TODO'}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {Object.keys(TASK_STATUS_LABEL).map((k) => (
              <option key={k} value={k}>
                {TASK_STATUS_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Priorité</Label>
          <select
            className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
            value={form.priority ?? 'MEDIUM'}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {Object.keys(TASK_PRIORITY_LABEL).map((k) => (
              <option key={k} value={k}>
                {TASK_PRIORITY_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="task-progress">Progression (0–100)</Label>
        <Input
          id="task-progress"
          type="number"
          min={0}
          max={100}
          value={form.progress ?? 0}
          onChange={(e) =>
            setForm({ ...form, progress: Number.parseInt(e.target.value, 10) || 0 })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="d1">Début planifié</Label>
          <Input
            id="d1"
            type="date"
            value={isoToDateInput(form.plannedStartDate)}
            onChange={(e) =>
              setForm({ ...form, plannedStartDate: dateInputToIso(e.target.value) })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d2">Fin planifiée</Label>
          <Input
            id="d2"
            type="date"
            value={isoToDateInput(form.plannedEndDate)}
            onChange={(e) =>
              setForm({ ...form, plannedEndDate: dateInputToIso(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Tâche parente</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
          value={form.parentTaskId ?? ''}
          onChange={(e) =>
            setForm({ ...form, parentTaskId: e.target.value || null })
          }
        >
          <option value="">— Aucune</option>
          {tasksForParent.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Dépend de (prédécesseur)</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
          value={form.dependsOnTaskId ?? ''}
          onChange={(e) =>
            setForm({ ...form, dependsOnTaskId: e.target.value || null })
          }
        >
          <option value="">— Aucune</option>
          {tasksForDepends.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Type de dépendance</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
          value={form.dependencyType ?? ''}
          onChange={(e) =>
            setForm({
              ...form,
              dependencyType: e.target.value || null,
            })
          }
        >
          {DEP_TYPES.map((d) => (
            <option key={d.value || 'none'} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Responsable</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
          value={form.ownerUserId ?? ''}
          onChange={(e) =>
            setForm({ ...form, ownerUserId: e.target.value || null })
          }
        >
          <option value="">—</option>
          {assignableOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function emptyCreateForm(): CreateProjectTaskPayload {
  return {
    name: '',
    status: 'TODO',
    priority: 'MEDIUM',
    progress: 0,
  };
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
    ownerUserId: m.ownerUserId,
    sortOrder: m.sortOrder,
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
    return { plannedStartDate: null, plannedEndDate: null };
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

const ganttDateInputClass =
  'h-7 max-w-[7rem] min-w-0 px-1.5 py-0 text-[11px] leading-tight shadow-none';

export type ProjectTaskPlanningSectionProps = {
  projectId: string;
  variant: 'full-table' | 'gantt-sidebar';
  /** Jalons en fin de liste pour aligner avec la frise Gantt ; clic → édition si `projects.update`. */
  milestoneRows?: { id: string; name: string }[];
  /** Masque la barre « Nouvelle tâche » (ex. Gantt : bouton hors zone scroll via ref). */
  hideToolbar?: boolean;
  /** Filtre statut des lignes tâches (Gantt uniquement), aligné avec la frise. */
  ganttTaskStatusFilter?: 'all' | string;
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
  },
  ref,
) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const tasksQuery = useProjectTasksQuery(projectId);
  const isGanttVariant = variant === 'gantt-sidebar';
  const milestonesQuery = useProjectMilestonesQuery(projectId, {
    enabled: isGanttVariant,
  });
  const assignableQuery = useProjectAssignableUsers({ enabled: canEdit });
  const createMut = useCreateProjectTaskMutation(projectId);
  const updateMut = useUpdateProjectTaskMutation(projectId);
  const updateMilestoneMut = useUpdateProjectMilestoneMutation(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTaskApi | null>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneApi | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<CreateProjectMilestonePayload>({
    name: '',
    targetDate: new Date().toISOString(),
    status: 'PLANNED',
  });

  const items = tasksQuery.data?.items ?? [];

  const byId = useMemo(() => new Map(items.map((t) => [t.id, t])), [items]);

  const treeRows = useMemo(() => {
    const sources = items.map((t) => ({
      ...t,
      parentTaskId: t.parentTaskId,
      sortOrder: t.sortOrder,
      plannedStartDate: t.plannedStartDate,
      createdAt: t.createdAt ?? t.id,
    }));
    return buildProjectTaskTreeRows(sources);
  }, [items]);

  const ganttTreeRows = useMemo(() => {
    if (!isGanttVariant || ganttTaskStatusFilter === 'all') return treeRows;
    return treeRows.filter((r) => r.status === ganttTaskStatusFilter);
  }, [treeRows, isGanttVariant, ganttTaskStatusFilter]);

  const assignableOptions = useMemo(
    () =>
      (assignableQuery.data ?? []).map((u) => ({
        id: u.id,
        label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      })),
    [assignableQuery.data],
  );

  const [createForm, setCreateForm] = useState<CreateProjectTaskPayload>(emptyCreateForm);

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreateForm(emptyCreateForm());
    setDialogOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openCreate }), [openCreate]);

  const milestoneItems = milestonesQuery.data?.items ?? [];

  const taskOptionsForMilestone = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

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
    if (!milestoneForm.name.trim() || !editingMilestone) return;
    const body: UpdateProjectMilestonePayload = { ...milestoneForm };
    updateMilestoneMut.mutate(
      { milestoneId: editingMilestone.id, body },
      { onSuccess: () => setMilestoneDialogOpen(false) },
    );
  };

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
      parentTaskId: t.parentTaskId,
      dependsOnTaskId: t.dependsOnTaskId,
      dependencyType: t.dependencyType,
      ownerUserId: t.ownerUserId,
      budgetLineId: t.budgetLineId,
      sortOrder: t.sortOrder,
    });
    setDialogOpen(true);
  };

  const tasksForParent = useMemo(() => {
    const excl = editing?.id;
    return items
      .filter((t) => t.id !== excl)
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, editing]);

  const tasksForDepends = useMemo(() => {
    const excl = editing?.id;
    return items
      .filter((t) => t.id !== excl)
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, editing]);

  const submit = () => {
    if (!createForm.name.trim()) return;
    if (editing) {
      const body: UpdateProjectTaskPayload = { ...createForm };
      updateMut.mutate(
        { taskId: editing.id, body },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMut.mutate(createForm, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const isGantt = isGanttVariant;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        isGantt ? 'min-h-0 flex-1 gap-2' : 'gap-4',
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
              Tâches structurées (hiérarchie, dépendances simples).
            </p>
          )}
          {isGantt && (
            <p className="text-muted-foreground max-w-[min(100%,22rem)] text-xs leading-snug">
              Planification : dates modifiables ici (début / fin) et sur la frise ; jalons : date
              cible et statut.
            </p>
          )}
          {canEdit && !hideToolbar && (
            <Button type="button" size={isGantt ? 'sm' : 'default'} onClick={openCreate}>
              Nouvelle tâche
            </Button>
          )}
        </div>
      )}

      {tasksQuery.isLoading ? (
        <LoadingState rows={isGantt ? 3 : 4} />
      ) : tasksQuery.isError ? (
        <p className="text-destructive text-sm">Impossible de charger les tâches.</p>
      ) : ganttTreeRows.length === 0 && milestoneRows.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">Aucune tâche.</p>
      ) : (
        <div
          className={cn(
            !isGantt && 'max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border/60',
            isGantt &&
              'bg-card/40 min-h-0 w-full overflow-auto rounded-lg border border-border/60',
          )}
        >
          <Table className={isGantt ? 'text-xs [&_input[type=date]]:cursor-text' : undefined}>
            <TableHeader
              className={isGantt ? 'bg-muted/30 sticky top-0 z-10 [&_tr]:border-border/60' : undefined}
            >
              {isGantt ? (
                <>
                  <TableRow className="border-border/40 hover:bg-transparent border-b bg-muted/30">
                    <TableHead
                      colSpan={canEdit ? 5 : 4}
                      className="text-muted-foreground py-1.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{ height: GANTT_ROW_PX }}
                    >
                      Planification
                    </TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[5rem] py-1.5 text-xs" style={{ height: GANTT_ROW_PX }}>
                      Tâche / jalon
                    </TableHead>
                    <TableHead
                      className="w-[7rem] min-w-[6.5rem] py-1.5 text-xs"
                      style={{ height: GANTT_ROW_PX }}
                    >
                      Début
                    </TableHead>
                    <TableHead
                      className="w-[7rem] min-w-[6.5rem] py-1.5 text-xs"
                      style={{ height: GANTT_ROW_PX }}
                    >
                      Fin / cible
                    </TableHead>
                    <TableHead className="min-w-[4.5rem] py-1.5 text-xs" style={{ height: GANTT_ROW_PX }}>
                      Statut
                    </TableHead>
                    {canEdit && (
                      <TableHead className="w-[72px] py-1.5 text-xs" style={{ height: GANTT_ROW_PX }}>
                        {' '}
                      </TableHead>
                    )}
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Fin planifiée</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Dépend de</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {(isGantt ? ganttTreeRows : treeRows).map((row) => {
                const pred = row.dependsOnTaskId
                  ? byId.get(row.dependsOnTaskId)
                  : undefined;
                if (isGantt) {
                  return (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/30"
                      style={{ height: GANTT_ROW_PX }}
                    >
                      <TableCell className="py-1 align-middle">
                        {canEdit ? (
                          <button
                            type="button"
                            className="hover:text-primary inline-block max-w-[11rem] cursor-pointer truncate text-left"
                            style={{ paddingLeft: `${row.depth * 10}px` }}
                            title={`${row.name} — ouvrir la fiche`}
                            onClick={() => openEdit(row)}
                          >
                            {row.name}
                          </button>
                        ) : (
                          <span
                            style={{ paddingLeft: `${row.depth * 10}px` }}
                            className="inline-block max-w-[11rem] truncate"
                            title={row.name}
                          >
                            {row.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-0.5 align-middle">
                        {canEdit ? (
                          <Input
                            type="date"
                            className={cn(ganttDateInputClass, 'bg-background/80')}
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
                      <TableCell className="py-0.5 align-middle">
                        {canEdit ? (
                          <Input
                            type="date"
                            className={cn(ganttDateInputClass, 'bg-background/80')}
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
                      <TableCell className="py-1 align-middle">
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
                      {canEdit && (
                        <TableCell className="py-1 align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[11px]"
                            onClick={() => openEdit(row)}
                          >
                            Fiche
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span
                        style={{ paddingLeft: `${row.depth * 12}px` }}
                        className="inline-block"
                      >
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell>{TASK_STATUS_LABEL[row.status] ?? row.status}</TableCell>
                    <TableCell>{TASK_PRIORITY_LABEL[row.priority] ?? row.priority}</TableCell>
                    <TableCell>
                      {row.plannedEndDate
                        ? new Date(row.plannedEndDate).toLocaleDateString('fr-FR')
                        : '—'}
                    </TableCell>
                    <TableCell>{row.progress} %</TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate">
                      {pred ? pred.name : '—'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                        >
                          Modifier
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {isGantt &&
                milestoneRows.map((m) => {
                  const ms = milestoneItems.find((x) => x.id === m.id);
                  return (
                    <TableRow
                      key={`ms-${m.id}`}
                      className="bg-amber-500/5 text-muted-foreground"
                      style={{ height: GANTT_ROW_PX }}
                    >
                      <TableCell className="py-1 align-middle">
                        {canEdit && ms ? (
                          <button
                            type="button"
                            className="hover:text-primary inline-flex max-w-[11rem] cursor-pointer items-center gap-1 truncate text-left italic"
                            title={`${m.name} — ouvrir la fiche jalon`}
                            onClick={() => openMilestoneEdit(ms.id)}
                          >
                            <span className="text-amber-600 dark:text-amber-500" aria-hidden>
                              ◆
                            </span>
                            <span>{m.name}</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex max-w-[11rem] items-center gap-1 truncate italic"
                            title={m.name}
                          >
                            <span className="text-amber-600 dark:text-amber-500" aria-hidden>
                              ◆
                            </span>
                            <span>{m.name}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground/70 py-1 align-middle text-[10px]">
                        —
                      </TableCell>
                      <TableCell className="py-0.5 align-middle">
                        {ms && canEdit ? (
                          <Input
                            type="date"
                            required
                            className={cn(ganttDateInputClass, 'bg-background/80')}
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
                              : milestonesQuery.isLoading
                                ? '…'
                                : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1 align-middle">
                        {ms && canEdit ? (
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
                      {canEdit && (
                        <TableCell className="py-1 align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[11px]"
                            disabled={!ms}
                            onClick={() => ms && openMilestoneEdit(ms.id)}
                          >
                            Fiche
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
          </DialogHeader>
          <TaskFormFields
            form={createForm}
            setForm={setCreateForm}
            tasksForParent={tasksForParent}
            tasksForDepends={tasksForDepends}
            assignableOptions={assignableOptions}
          />
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
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Modifier le jalon</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gantt-ms-name">Nom</Label>
              <Input
                id="gantt-ms-name"
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gantt-ms-desc">Description</Label>
              <textarea
                id="gantt-ms-desc"
                className="border-input bg-background min-h-[64px] w-full rounded-lg border px-3 py-2 text-sm"
                value={milestoneForm.description ?? ''}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gantt-ms-target">Date cible</Label>
                <Input
                  id="gantt-ms-target"
                  type="date"
                  value={isoToDateInput(milestoneForm.targetDate)}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      targetDate: dateInputToIso(e.target.value) ?? milestoneForm.targetDate,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <select
                  className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                  value={milestoneForm.status ?? 'PLANNED'}
                  onChange={(e) =>
                    setMilestoneForm({ ...milestoneForm, status: e.target.value })
                  }
                >
                  {Object.keys(MILESTONE_STATUS_LABEL).map((k) => (
                    <option key={k} value={k}>
                      {MILESTONE_STATUS_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gantt-ms-achieved">Date d’atteinte (optionnel)</Label>
              <Input
                id="gantt-ms-achieved"
                type="date"
                value={isoToDateInput(milestoneForm.achievedDate)}
                onChange={(e) =>
                  setMilestoneForm({
                    ...milestoneForm,
                    achievedDate: e.target.value
                      ? dateInputToIso(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tâche liée</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                value={milestoneForm.linkedTaskId ?? ''}
                onChange={(e) =>
                  setMilestoneForm({
                    ...milestoneForm,
                    linkedTaskId: e.target.value || null,
                  })
                }
              >
                <option value="">—</option>
                {taskOptionsForMilestone.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
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
