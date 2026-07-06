'use client';

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { useTablePan } from '@/hooks/use-table-pan';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { useProjectTaskBucketsQuery } from '../hooks/use-project-task-buckets-query';
import { useProjectTaskLabelsQuery } from '../hooks/use-project-task-labels-query';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import {
  useCreateProjectTaskMutation,
  useUpdateProjectTaskMutation,
} from '../hooks/use-project-planning-mutations';
import { useCreateProjectTaskLabelMutation } from '../hooks/use-project-labels-mutations';
import type {
  CreateProjectTaskPayload,
  UpdateProjectTaskPayload,
} from '../api/projects.api';
import type { ProjectTaskApi } from '../types/project.types';
import { ProjectTaskFormDialog } from './project-task-form-dialog';
import {
  TASK_PRIORITY_LABEL,
} from '../constants/project-enum-labels';
import {
  taskAssigneeDisplayName,
  taskProgressFillClass,
  taskStatusBadgeClass,
  taskStatusBadgeLabel,
} from '../lib/project-task-display';
import { useProjectMicrosoftLinkQuery } from '../options/hooks/use-project-microsoft-link-query';

type BucketKey = string | '__none__';
const NONE_KEY: BucketKey = '__none__';
function bucketIdToKey(bucketId: string | null): BucketKey {
  return bucketId ?? NONE_KEY;
}
function bucketKeyToId(key: BucketKey): string | null {
  return key === NONE_KEY ? null : key;
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

function formatFrDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function priorityTagClass(priority: string): string {
  if (priority === 'HIGH' || priority === 'CRITICAL') return 'starium-kcard-tag--danger';
  if (priority === 'LOW') return 'starium-kcard-tag--neutral';
  return 'starium-kcard-tag--gold';
}

function priorityStripeColor(priority: string): string {
  if (priority === 'HIGH' || priority === 'CRITICAL') return 'var(--state-danger)';
  if (priority === 'LOW') return 'var(--state-success)';
  return 'var(--brand-gold)';
}

const COLUMN_DOT_COLORS = [
  'var(--neutral-400)',
  'var(--state-info)',
  'var(--purple)',
  'var(--state-success)',
  'var(--brand-gold)',
] as const;

type KanbanColumn = {
  bucketId: string | null;
  label: string;
};

export type ProjectPlanningKanbanTabHandle = {
  openCreate: () => void;
};

export const ProjectPlanningKanbanTab = forwardRef<
  ProjectPlanningKanbanTabHandle,
  { projectId: string; showChecklists?: boolean; showDescriptions?: boolean }
>(function ProjectPlanningKanbanTab(
  { projectId, showChecklists = false, showDescriptions = false },
  ref,
) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const canListProjectLabels = has('projects.read') || canEdit;

  const tasksQuery = useProjectTasksQuery(projectId);
  const bucketsQuery = useProjectTaskBucketsQuery(projectId);
  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const syncMicrosoftPlannerLabelsEnabled = linkQuery.data?.useMicrosoftPlannerLabels ?? false;
  const taskLabelsQuery = useProjectTaskLabelsQuery(projectId, canListProjectLabels);
  const milestonesQuery = useProjectMilestonesQuery(projectId, { enabled: false });
  // `TaskFormDialogFields` affiche un champ hiérarchie/dépendances mais pas besoin des jalons ici.
  // On garde la requête désactivée pour limiter les appels.
  void milestonesQuery;

  const assignableQuery = useProjectAssignableUsers({ enabled: canEdit });

  const createMut = useCreateProjectTaskMutation(projectId);
  const updateMut = useUpdateProjectTaskMutation(projectId);

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

  const canCreateTaskLabels = canEdit && !syncMicrosoftPlannerLabelsEnabled;
  const createTaskLabelMut = useCreateProjectTaskLabelMutation(projectId);
  const onCreateTaskLabel = async (name: string) => {
    const created = await createTaskLabelMut.mutateAsync({ name });
    return created.id;
  };

  const items = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const buckets = useMemo(
    () => bucketsQuery.data?.items ?? [],
    [bucketsQuery.data?.items],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTaskApi | null>(null);
  const [createForm, setCreateForm] = useState<CreateProjectTaskPayload>(emptyCreateForm());

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverBucketKey, setDragOverBucketKey] = useState<BucketKey | null>(
    null,
  );
  const kanbanPan = useTablePan();

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreateForm(emptyCreateForm());
    setDialogOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openCreate }), [openCreate]);

  const openEdit = useCallback((t: ProjectTaskApi) => {
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
  }, []);

  const phaseOptions: Array<{ id: string; name: string }> = [];

  const tasksForDepends = useMemo(() => {
    const excl = editing?.id;
    return items
      .filter((t) => t.id !== excl)
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, editing]);

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
      buckets.map((b) => ({
        id: b.id,
        label: b.name,
      })),
    [buckets],
  );

  const columns: KanbanColumn[] = useMemo(() => {
    const sortedBuckets = [...buckets].sort((a, b) => a.sortOrder - b.sortOrder);
    return [
      { bucketId: null, label: '— Aucun' },
      ...sortedBuckets.map((b) => ({ bucketId: b.id, label: b.name })),
    ];
  }, [buckets]);

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
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  const isLoading = tasksQuery.isLoading || bucketsQuery.isLoading;
  if (isLoading) {
    return (
      <div className="starium-tablecard p-6">
        <LoadingState rows={8} />
      </div>
    );
  }

  const handleDropOnBucket = (targetBucketId: string | null) => {
    if (!canEdit) return;
    if (!draggingTaskId) return;

    const dragged = items.find((t) => t.id === draggingTaskId);
    if (!dragged) return;
    if ((dragged.bucketId ?? null) === (targetBucketId ?? null)) return;

    updateMut.mutate({
      taskId: dragged.id,
      body: { bucketId: targetBucketId },
      silentToast: true,
    });
  };

  const toggleChecklistItem = (
    task: ProjectTaskApi,
    itemId: string,
    isChecked: boolean,
  ) => {
    if (!canEdit) return;
    const next = (task.checklistItems ?? []).map((c) =>
      c.id === itemId ? { ...c, isChecked } : c,
    );
    updateMut.mutate({
      taskId: task.id,
      body: {
        checklistItems: next.map((c, i) => ({
          id: c.id,
          title: c.title,
          isChecked: c.isChecked,
          sortOrder: c.sortOrder ?? i,
        })),
      },
      silentToast: true,
    });
  };

  return (
    <>
      <div
        ref={kanbanPan.scrollRef}
        className={cn(
          'starium-kanban-scroll',
          kanbanPan.isPanning && 'starium-kanban-scroll--panning',
        )}
        onPointerDown={kanbanPan.onPointerDown}
        aria-label="Colonnes Kanban — faites glisser horizontalement pour parcourir"
      >
        <div className="starium-kanban" role="list" aria-label="Vue Kanban des tâches">
        {columns.map((col, colIndex) => {
          const colTasks = items.filter((t) => (t.bucketId ?? null) === col.bucketId);
          const colKey = bucketIdToKey(col.bucketId);
          const isOver =
            canEdit && dragOverBucketKey !== null && dragOverBucketKey === colKey;
          const dotColor = COLUMN_DOT_COLORS[colIndex % COLUMN_DOT_COLORS.length];

          return (
            <div
              key={col.bucketId ?? 'none'}
              className={cn('starium-kcol', isOver && 'starium-kcol--over')}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOverBucketKey(colKey);
              }}
              onDragEnter={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOverBucketKey(colKey);
              }}
              onDragLeave={() => {
                setDragOverBucketKey((prev) => (prev === colKey ? null : prev));
              }}
              onDrop={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOverBucketKey(null);

                const taskId = e.dataTransfer.getData('text/plain');
                if (!taskId) return;
                setDraggingTaskId(taskId);
                handleDropOnBucket(col.bucketId);
                setDraggingTaskId(null);
              }}
            >
              <div className="starium-kcol-head">
                <div className="starium-kcol-title">
                  <span
                    className="starium-kcol-dot"
                    style={{ background: dotColor }}
                    aria-hidden
                  />
                  {col.label}
                </div>
                <span className="starium-kcol-count">{colTasks.length}</span>
              </div>

              {colTasks.map((t, taskIndex) => {
                const isDone = t.status === 'DONE';
                const isLate = t.isLate ?? false;
                const progress = Math.min(100, Math.max(0, Math.round(t.progress ?? 0)));
                const assigneeName = taskAssigneeDisplayName(t);
                const showProgress = t.status === 'IN_PROGRESS' && progress > 0;
                const checklist = [...(t.checklistItems ?? [])].sort(
                  (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
                );
                const showCardChecklist = showChecklists && checklist.length > 0;
                const checkedCount = checklist.filter((c) => c.isChecked).length;
                const descriptionText = t.description?.trim() ?? '';
                const showCardDescription = showDescriptions && descriptionText.length > 0;

                return (
                  <button
                    key={t.id}
                    type="button"
                    className="starium-kcard"
                    onClick={() => canEdit && openEdit(t)}
                    disabled={!canEdit}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      if (!canEdit) return;
                      setDraggingTaskId(t.id);
                      e.dataTransfer.setData('text/plain', t.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggingTaskId(null);
                      setDragOverBucketKey(null);
                    }}
                  >
                    <div className="flex">
                      <div
                        className="starium-kprio"
                        style={{ background: priorityStripeColor(t.priority) }}
                        aria-hidden
                      />
                      <div className={cn('min-w-0 flex-1', isDone && 'opacity-80')}>
                        <div className="starium-kcard-top">
                          <span
                            className={cn(
                              'starium-ds-badge starium-kcard-status',
                              taskStatusBadgeClass(t.status, isLate),
                            )}
                          >
                            {taskStatusBadgeLabel(t.status, isLate)}
                          </span>
                          <span className={cn('starium-kcard-tag', priorityTagClass(t.priority))}>
                            {`Priorité ${(TASK_PRIORITY_LABEL[t.priority] ?? t.priority).toLowerCase()}`}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'starium-kcard-title',
                            isDone && 'line-through decoration-muted-foreground/40',
                          )}
                        >
                          {t.name}
                        </div>

                        {showCardDescription ? (
                          <p className="starium-kcard-desc" title={descriptionText}>
                            {descriptionText}
                          </p>
                        ) : null}

                        {showProgress ? (
                          <div className="starium-dt-prog mb-2.5 mt-1">
                            <div className="starium-dt-prog-track" aria-hidden>
                              <div
                                className={cn(
                                  'starium-dt-prog-fill',
                                  taskProgressFillClass(progress, isLate),
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="starium-dt-prog-pct">{progress}%</span>
                          </div>
                        ) : null}

                        {showCardChecklist ? (
                          <div
                            className="starium-kcard-checklist"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <div className="starium-kcard-checklist-head">
                              <span>Liste de contrôle</span>
                              <span className="starium-kcard-checklist-count" aria-hidden>
                                {checkedCount}/{checklist.length}
                              </span>
                            </div>
                            <ul className="starium-kcard-checklist-items">
                              {checklist.map((item) => (
                                <li
                                  key={item.id}
                                  className={cn(
                                    'starium-kcard-checklist-item',
                                    item.isChecked && 'starium-kcard-checklist-item--done',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.isChecked}
                                    disabled={!canEdit}
                                    aria-label={`${item.isChecked ? 'Coché' : 'Non coché'} : ${item.title}`}
                                    onChange={(e) =>
                                      toggleChecklistItem(t, item.id, e.target.checked)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  />
                                  <span className="min-w-0 truncate" title={item.title}>
                                    {item.title}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="starium-kcard-foot">
                          <span
                            className={cn(
                              'starium-kcard-due',
                              isLate && !isDone && 'starium-kcard-due--late',
                            )}
                          >
                            {isDone ? (
                              <Check strokeWidth={2} aria-hidden />
                            ) : (
                              <Calendar strokeWidth={1.75} aria-hidden />
                            )}
                            {formatFrDateShort(t.plannedEndDate)}
                          </span>
                          {t.responsibleResourceId ? (
                            <UserInitialsAvatar
                              displayName={assigneeName}
                              seed={t.responsibleResourceId}
                              themeIndex={taskIndex}
                              size="sm"
                              className="starium-kav !size-6 !text-[9px]"
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {colTasks.length === 0 && (
                <div className="starium-kcol-empty">Aucune tâche</div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      <ProjectTaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={!!editing}
        form={createForm}
        onPatch={(patch) =>
          setCreateForm((prev) => ({
            ...prev,
            ...patch,
          }))
        }
        onSubmit={submit}
        isSubmitting={createMut.isPending || updateMut.isPending}
        phaseOptions={phaseOptions}
        tasksForDepends={tasksForDepends}
        assignableOptions={assignableOptions}
        bucketOptions={bucketOptions}
        taskLabelOptions={taskLabelOptions}
        syncMicrosoftPlannerLabelsEnabled={syncMicrosoftPlannerLabelsEnabled}
        canCreateTaskLabels={canCreateTaskLabels}
        onCreateTaskLabel={onCreateTaskLabel}
        fieldIdPrefix="kanban-task"
      />
    </>
  );
});

ProjectPlanningKanbanTab.displayName = 'ProjectPlanningKanbanTab';

