'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  Calendar,
  ChevronDown,
  Flag,
  LayoutGrid,
  RotateCcw,
  Search,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { createProjectTaskPhase, listProjectTaskPhases } from '../api/projects.api';
import type {
  CreateProjectTaskPayload,
  UpdateProjectTaskPayload,
} from '../api/projects.api';
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../constants/project-enum-labels';
import { projectPlanning } from '../constants/project-routes';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTaskBucketsQuery } from '../hooks/use-project-task-buckets-query';
import { useProjectTaskLabelsQuery } from '../hooks/use-project-task-labels-query';
import {
  useCreateProjectTaskMutation,
  useUpdateProjectTaskMutation,
} from '../hooks/use-project-planning-mutations';
import { useCreateProjectTaskLabelMutation } from '../hooks/use-project-labels-mutations';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import {
  sortTasksForList,
  TASK_ICON_TONES,
  taskAssigneeDisplayName,
  taskAssigneeShortLabel,
  taskPriorityFlagClass,
  taskProgressFillClass,
  taskStatusBadgeClass,
  taskStatusBadgeLabel,
} from '../lib/project-task-display';
import { formatProjectDateLong } from '../lib/projects-list-display';
import { useProjectMicrosoftLinkQuery } from '../options/hooks/use-project-microsoft-link-query';
import type { ProjectTaskApi } from '../types/project.types';
import {
  DEFAULT_TASK_PAGE_SIZE,
  ProjectTasksPagination,
} from './project-tasks-pagination';
import { ProjectTaskFormDialog } from './project-task-form-dialog';
import { ProjectTaskRowActionsMenu } from './project-task-row-actions-menu';

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

export type ProjectTasksListTabHandle = {
  openCreate: () => void;
};

function TaskTableRow({
  task,
  index,
  phaseName,
  canEdit,
  projectId,
  onEdit,
  onMarkDone,
  onMarkInProgress,
  onDuplicate,
}: {
  task: ProjectTaskApi;
  index: number;
  phaseName: string | null;
  canEdit: boolean;
  projectId: string;
  onEdit: (task: ProjectTaskApi) => void;
  onMarkDone: (task: ProjectTaskApi) => void;
  onMarkInProgress: (task: ProjectTaskApi) => void;
  onDuplicate: (task: ProjectTaskApi) => void;
}) {
  const assignee = taskAssigneeShortLabel(task);
  const assigneeName = taskAssigneeDisplayName(task);
  const isLate = task.isLate ?? false;
  const progress = Math.min(100, Math.max(0, Math.round(task.progress ?? 0)));
  const iconTone = TASK_ICON_TONES[index % TASK_ICON_TONES.length];
  const subtitle = phaseName ?? task.code ?? task.description;

  return (
    <tr
      className={cn(canEdit && 'cursor-pointer')}
      onClick={() => canEdit && onEdit(task)}
      onKeyDown={(event) => {
        if (!canEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit(task);
        }
      }}
      tabIndex={canEdit ? 0 : undefined}
    >
      <td>
        <div className="starium-dt-tname">
          <div className={cn('starium-dt-tname-ico', iconTone)} aria-hidden>
            <LayoutGrid strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="starium-dt-cell-strong truncate">{task.name}</div>
            {subtitle ? (
              <div className="starium-dt-cell-sub truncate">{subtitle}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td>
        <span className={cn('starium-ds-badge', taskStatusBadgeClass(task.status, isLate))}>
          {taskStatusBadgeLabel(task.status, isLate)}
        </span>
      </td>
      <td>
        <span className={cn('starium-dt-flag', taskPriorityFlagClass(task.priority))}>
          <Flag strokeWidth={2} aria-hidden />
          {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
      </td>
      <td>
        <div
          className={cn(
            'starium-dt-date',
            isLate && task.status !== 'DONE' && 'starium-dt-date--late',
          )}
        >
          <Calendar strokeWidth={1.75} aria-hidden />
          {formatProjectDateLong(task.plannedEndDate)}
        </div>
      </td>
      <td>
        {assignee !== '—' ? (
          <div className="starium-dt-assignee">
            <UserInitialsAvatar
              displayName={assigneeName}
              seed={task.responsibleResourceId ?? task.id}
              themeIndex={index}
              size="sm"
            />
            <span className="starium-dt-assignee-name">{assignee}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td>
        <div className="starium-dt-prog">
          <span className="starium-dt-prog-pct">{progress}%</span>
          <div className="starium-dt-prog-track" aria-hidden>
            <div
              className={cn('starium-dt-prog-fill', taskProgressFillClass(progress, isLate))}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </td>
      <td className="text-right">
        {canEdit ? (
          <ProjectTaskRowActionsMenu
            task={task}
            planningHref={projectPlanning(projectId, 'gantt')}
            onEdit={onEdit}
            onMarkDone={onMarkDone}
            onMarkInProgress={onMarkInProgress}
            onDuplicate={onDuplicate}
          />
        ) : null}
      </td>
    </tr>
  );
}

export const ProjectTasksListTab = forwardRef<
  ProjectTasksListTabHandle,
  { projectId: string }
>(function ProjectTasksListTab({ projectId }, ref) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const canListProjectLabels = has('projects.read') || canEdit;
  const authFetch = useAuthenticatedFetch();

  const tasksQuery = useProjectTasksQuery(projectId);
  const bucketsQuery = useProjectTaskBucketsQuery(projectId);
  const assignableQuery = useProjectAssignableUsers({ enabled: canEdit });
  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const taskLabelsQuery = useProjectTaskLabelsQuery(projectId, canListProjectLabels);

  const createMut = useCreateProjectTaskMutation(projectId);
  const updateMut = useUpdateProjectTaskMutation(projectId);
  const createTaskLabelMut = useCreateProjectTaskLabelMutation(projectId);

  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TASK_PAGE_SIZE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTaskApi | null>(null);
  const [createForm, setCreateForm] = useState<CreateProjectTaskPayload>(emptyCreateForm());
  const [phaseOptions, setPhaseOptions] = useState<
    Array<{ id: string; name: string; sortOrder: number }>
  >([]);

  const items = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const phaseNameById = useMemo(
    () => new Map(phaseOptions.map((p) => [p.id, p.name] as const)),
    [phaseOptions],
  );

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

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of items) {
      const id = task.responsibleResourceId;
      if (!id) continue;
      map.set(id, taskAssigneeDisplayName(task));
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [items]);

  const filteredTasks = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase();
    return sortTasksForList(items).filter((task) => {
      if (normalizedName && !task.name.toLowerCase().includes(normalizedName)) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === '__none__') {
          if (task.responsibleResourceId) return false;
        } else if (task.responsibleResourceId !== assigneeFilter) {
          return false;
        }
      }
      return true;
    });
  }, [items, nameFilter, statusFilter, assigneeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedTasks = useMemo(() => {
    const offset = (safePage - 1) * pageSize;
    return filteredTasks.slice(offset, offset + pageSize);
  }, [filteredTasks, safePage, pageSize]);

  const resetFilters = () => {
    setNameFilter('');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    nameFilter.trim().length > 0 || statusFilter !== 'all' || assigneeFilter !== 'all';

  const openCreate = useCallback(() => {
    setEditing(null);
    setCreateForm(emptyCreateForm());
    setDialogOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openCreate }), [openCreate]);

  const openEdit = useCallback((task: ProjectTaskApi) => {
    setEditing(task);
    setCreateForm({
      name: task.name,
      description: task.description ?? undefined,
      code: task.code ?? undefined,
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      plannedStartDate: task.plannedStartDate ?? undefined,
      plannedEndDate: task.plannedEndDate ?? undefined,
      actualStartDate: task.actualStartDate ?? undefined,
      actualEndDate: task.actualEndDate ?? undefined,
      phaseId: task.phaseId,
      dependsOnTaskId: task.dependsOnTaskId,
      dependencyType: task.dependencyType,
      ownerUserId: task.ownerUserId,
      budgetLineId: task.budgetLineId,
      bucketId: task.bucketId ?? undefined,
      sortOrder: task.sortOrder,
      taskLabelIds: task.taskLabelIds ?? [],
      checklistItems: (task.checklistItems ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        isChecked: c.isChecked,
        sortOrder: c.sortOrder,
      })),
    });
    setDialogOpen(true);
  }, []);

  const markDone = useCallback(
    (task: ProjectTaskApi) => {
      updateMut.mutate({
        taskId: task.id,
        body: { status: 'DONE', progress: 100 },
      });
    },
    [updateMut],
  );

  const markInProgress = useCallback(
    (task: ProjectTaskApi) => {
      updateMut.mutate({
        taskId: task.id,
        body: { status: 'IN_PROGRESS' },
      });
    },
    [updateMut],
  );

  const duplicateTask = useCallback(
    (task: ProjectTaskApi) => {
      createMut.mutate({
        name: `${task.name} (copie)`,
        description: task.description ?? undefined,
        code: undefined,
        status: 'TODO',
        priority: task.priority,
        progress: 0,
        plannedStartDate: task.plannedStartDate ?? undefined,
        plannedEndDate: task.plannedEndDate ?? undefined,
        phaseId: task.phaseId,
        ownerUserId: task.ownerUserId,
        bucketId: task.bucketId ?? undefined,
        taskLabelIds: task.taskLabelIds ?? [],
        checklistItems: (task.checklistItems ?? []).map((c, i) => ({
          title: c.title,
          isChecked: false,
          sortOrder: c.sortOrder ?? i,
        })),
      });
    },
    [createMut],
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

  const syncMicrosoftPlannerLabelsEnabled = linkQuery.data?.useMicrosoftPlannerLabels ?? false;
  const canCreateTaskLabels = canEdit && !syncMicrosoftPlannerLabelsEnabled;

  const onCreateTaskLabel = async (name: string) => {
    const created = await createTaskLabelMut.mutateAsync({ name });
    return created.id;
  };

  const onCreatePhase = useCallback(
    async (name: string) => {
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
      updateMut.mutate({ taskId: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
      return;
    }
    createMut.mutate(
      { ...createForm, checklistItems },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  if (tasksQuery.isLoading) {
    return (
      <div className="starium-tablecard p-6">
        <LoadingState rows={6} />
      </div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Impossible de charger les tâches.
      </p>
    );
  }

  return (
    <>
      <div className="starium-toolbar" role="search">
        <label className="starium-search-input">
          <Search strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={nameFilter}
            onChange={(event) => {
              setNameFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher une tâche…"
            aria-label="Rechercher une tâche"
          />
        </label>

        <div className="starium-fbtn-wrap">
          <Filter className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
          <select
            className="starium-fbtn-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par statut"
          >
            <option value="all">Statut</option>
            {Object.keys(TASK_STATUS_LABEL).map((key) => (
              <option key={key} value={key}>
                {TASK_STATUS_LABEL[key]}
              </option>
            ))}
          </select>
          <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
        </div>

        <div className="starium-fbtn-wrap">
          <User className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
          <select
            className="starium-fbtn-select"
            value={assigneeFilter}
            onChange={(event) => {
              setAssigneeFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par assigné"
          >
            <option value="all">Assigné à</option>
            <option value="__none__">Non assignée</option>
            {assigneeOptions.map((option) => (
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
      </div>

      <div className="starium-tablecard">
        <div className="starium-table-wrap">
          <table className="starium-dt">
            <caption className="sr-only">Liste des tâches du projet</caption>
            <thead>
              <tr>
                <th scope="col">Tâche</th>
                <th scope="col">Statut</th>
                <th scope="col">Priorité</th>
                <th scope="col">Échéance</th>
                <th scope="col">Assigné à</th>
                <th scope="col">Avancement</th>
                <th scope="col" className="starium-dt__right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {items.length === 0
                      ? 'Aucune tâche planifiée.'
                      : 'Aucune tâche ne correspond aux filtres.'}
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task, index) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    index={(safePage - 1) * pageSize + index}
                    phaseName={task.phaseId ? (phaseNameById.get(task.phaseId) ?? null) : null}
                    canEdit={canEdit}
                    projectId={projectId}
                    onEdit={openEdit}
                    onMarkDone={markDone}
                    onMarkInProgress={markInProgress}
                    onDuplicate={duplicateTask}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <ProjectTasksPagination
          total={filteredTasks.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <ProjectTaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={!!editing}
        form={createForm}
        onPatch={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
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
        canCreatePhase={canEdit}
        onCreatePhase={onCreatePhase}
        fieldIdPrefix="tasks-tab"
      />
    </>
  );
});

function Filter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

ProjectTasksListTab.displayName = 'ProjectTasksListTab';
