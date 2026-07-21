'use client';

import { useMemo, useState } from 'react';
import { Building2, Calendar, Check } from 'lucide-react';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { useTablePan } from '@/hooks/use-table-pan';
import type { ActionPlanTaskApi } from '@/features/projects/types/project.types';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import {
  PROJECT_TASK_STATUSES,
  taskPriorityLabel,
  taskStatusLabel,
} from '@/lib/ui/badge-registry';
import {
  TASK_PRIORITY_LABEL,
} from '../constants/project-enum-labels';
import {
  taskAssigneeDisplayName,
  taskProgressFillClass,
  taskStatusBadgeClass,
  taskStatusBadgeLabel,
} from '../lib/project-task-display';

/** Colonnes Kanban — workflow principal (aligné maquette « À faire → Terminé »). */
const KANBAN_STATUS_COLUMNS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;

const COLUMN_DOT_COLORS = [
  'var(--neutral-400)',
  'var(--state-info)',
  'var(--state-danger)',
  'var(--state-success)',
] as const;

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

function assigneeSeed(task: ActionPlanTaskApi): string | null {
  return task.assignedResourceIds?.[0] ?? task.assignedResources?.[0]?.id ?? task.responsibleResourceId ?? null;
}

export type ActionPlanTasksKanbanProps = {
  items: ActionPlanTaskApi[];
  statusFilter?: string;
  canUpdate: boolean;
  isUpdating?: boolean;
  onTaskClick: (taskId: string) => void;
  onStatusDrop: (payload: { taskId: string; fromStatus: string; toStatus: string }) => void;
};

export function ActionPlanTasksKanban({
  items,
  statusFilter,
  canUpdate,
  isUpdating = false,
  onTaskClick,
  onStatusDrop,
}: ActionPlanTasksKanbanProps) {
  const { merged } = useClientUiBadgeConfig();
  const kanbanPan = useTablePan();
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const visibleStatuses = useMemo(() => {
    if (statusFilter) {
      return PROJECT_TASK_STATUSES.filter((s) => s === statusFilter);
    }
    return [...KANBAN_STATUS_COLUMNS];
  }, [statusFilter]);

  const grouped = useMemo(() => {
    const byStatus = new Map<string, ActionPlanTaskApi[]>();
    for (const status of visibleStatuses) {
      byStatus.set(status, []);
    }
    for (const item of items) {
      if (!byStatus.has(item.status)) continue;
      byStatus.get(item.status)?.push(item);
    }
    return byStatus;
  }, [items, visibleStatuses]);

  const overflowCount = useMemo(() => {
    if (statusFilter) return 0;
    return items.filter((t) => !KANBAN_STATUS_COLUMNS.includes(t.status as (typeof KANBAN_STATUS_COLUMNS)[number])).length;
  }, [items, statusFilter]);

  return (
    <div className="starium-proj-tasks flex min-h-0 flex-col">
      {overflowCount > 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {overflowCount} action{overflowCount > 1 ? 's' : ''} hors colonnes principales — filtrez
          par statut (brouillon, annulé).
        </p>
      ) : null}

      <div
        ref={kanbanPan.scrollRef}
        className={cn(
          'starium-kanban-scroll',
          kanbanPan.isPanning && 'starium-kanban-scroll--panning',
        )}
        onPointerDown={kanbanPan.onPointerDown}
        aria-label="Colonnes Kanban — faites glisser horizontalement pour parcourir"
      >
        <div className="starium-kanban" role="list" aria-label="Vue Kanban des tâches du plan">
          {visibleStatuses.map((status, colIndex) => {
            const colTasks = grouped.get(status) ?? [];
            const label = taskStatusLabel(merged, status);
            const canDropHere = canUpdate && !isUpdating;
            const isOver = dragOverStatus === status && canDropHere;
            const dotColor = COLUMN_DOT_COLORS[colIndex % COLUMN_DOT_COLORS.length];

            return (
              <div
                key={status}
                className={cn('starium-kcol', isOver && 'starium-kcol--over')}
                onDragOver={(event) => {
                  if (!canDropHere) return;
                  event.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragEnter={(event) => {
                  if (!canDropHere) return;
                  event.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={() => {
                  setDragOverStatus((prev) => (prev === status ? null : prev));
                }}
                onDrop={(event) => {
                  if (!canDropHere) return;
                  event.preventDefault();
                  setDragOverStatus(null);

                  const taskId = event.dataTransfer.getData('text/plain');
                  const sourceStatus = event.dataTransfer.getData('task-status');
                  if (!taskId || !sourceStatus || sourceStatus === status) return;

                  onStatusDrop({ taskId, fromStatus: sourceStatus, toStatus: status });
                }}
              >
                <div className="starium-kcol-head">
                  <div className="starium-kcol-title">
                    <span
                      className="starium-kcol-dot"
                      style={{ background: dotColor }}
                      aria-hidden
                    />
                    {label}
                  </div>
                  <span className="starium-kcol-count">{colTasks.length}</span>
                </div>

                {colTasks.map((task, taskIndex) => {
                  const isDone = task.status === 'DONE';
                  const isLate = task.isLate ?? false;
                  const progress = Math.min(100, Math.max(0, Math.round(task.progress ?? 0)));
                  const assigneeName = taskAssigneeDisplayName(task);
                  const showProgress = task.status === 'IN_PROGRESS' && progress > 0;
                  const priorityLabel =
                    TASK_PRIORITY_LABEL[task.priority] ??
                    taskPriorityLabel(merged, task.priority);

                  return (
                    <button
                      key={task.id}
                      type="button"
                      className="starium-kcard text-left"
                      onClick={() => onTaskClick(task.id)}
                      draggable={canUpdate}
                      onDragStart={(event) => {
                        if (!canUpdate) return;
                        event.dataTransfer.setData('text/plain', task.id);
                        event.dataTransfer.setData('task-status', task.status);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <div className="flex">
                        <div
                          className="starium-kprio"
                          style={{ background: priorityStripeColor(task.priority) }}
                          aria-hidden
                        />
                        <div className={cn('min-w-0 flex-1', isDone && 'opacity-80')}>
                          <div className="starium-kcard-top">
                            <span
                              className={cn(
                                'starium-ds-badge starium-kcard-status',
                                taskStatusBadgeClass(task.status, isLate),
                              )}
                            >
                              {taskStatusBadgeLabel(task.status, isLate)}
                            </span>
                            <span className={cn('starium-kcard-tag', priorityTagClass(task.priority))}>
                              {`Priorité ${priorityLabel.toLowerCase()}`}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'starium-kcard-title',
                              isDone && 'line-through decoration-muted-foreground/40',
                            )}
                          >
                            {task.name}
                          </div>

                          {task.project ? (
                            <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="size-3 shrink-0" aria-hidden />
                              <span className="truncate">
                                {task.project.code} — {task.project.name}
                              </span>
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
                              {formatFrDateShort(task.plannedEndDate)}
                            </span>
                            {assigneeSeed(task) ? (
                              <UserInitialsAvatar
                                displayName={assigneeName}
                                seed={assigneeSeed(task)!}
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

                {colTasks.length === 0 ? (
                  <div className="starium-kcol-empty">Aucune tâche</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
