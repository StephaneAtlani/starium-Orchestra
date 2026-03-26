'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
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
import { TaskFormDialogFields } from './task-form-dialog-fields';
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
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

function formatFrDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

type KanbanColumn = {
  bucketId: string | null;
  label: string;
};

export function ProjectPlanningKanbanTab({ projectId }: { projectId: string }) {
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

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreateForm(emptyCreateForm());
    setDialogOpen(true);
  }, []);

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
  if (isLoading) return <LoadingState rows={8} />;

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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Vue Kanban : regroupement par colonnes Kanban / Planner.
        </p>
        {canEdit && (
          <Button type="button" onClick={openCreate}>
            Nouvelle tâche
          </Button>
        )}
      </div>

      <div className="flex min-w-0 gap-4 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colTasks = items
            .filter((t) => (t.bucketId ?? null) === col.bucketId);
          const colKey = bucketIdToKey(col.bucketId);
          const isOver =
            canEdit && dragOverBucketKey !== null && dragOverBucketKey === colKey;

          return (
            <div
              key={col.bucketId ?? 'none'}
              className={cn(
                'w-[22rem] min-w-[22rem] rounded-lg border bg-muted/20 p-3',
                isOver
                  ? 'border-primary/60 ring-1 ring-primary/30'
                  : 'border-border/60',
              )}
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{col.label}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {colTasks.length}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {colTasks.map((t) => {
                  const statusLabel = TASK_STATUS_LABEL[t.status] ?? t.status;
                  const priorityLabel = TASK_PRIORITY_LABEL[t.priority] ?? t.priority;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={cn(
                        'w-full rounded-lg border border-border/50 bg-background p-2 text-left',
                        'hover:border-border/80 hover:bg-muted/40',
                      )}
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{t.name}</div>
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {statusLabel}
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span>
                          Priorité : {priorityLabel}
                        </span>
                        <span>
                          {t.plannedEndDate ? `Fin ${formatFrDate(t.plannedEndDate)}` : 'Sans échéance'}
                        </span>
                      </div>

                      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted/50">
                        <div
                          className="h-full rounded bg-primary/70"
                          style={{ width: `${t.progress ?? 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="rounded-md border border-dashed border-border/50 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
                    Aucune tâche
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-[min(80vw,72rem)] sm:max-w-[min(80vw,72rem)]"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
            <DialogDescription>
              Mettre à jour les informations de la tâche, son planning et ses dépendances.
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
              fieldIdPrefix="planning-task"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={
                !createForm.name.trim() ||
                createMut.isPending ||
                updateMut.isPending
              }
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

