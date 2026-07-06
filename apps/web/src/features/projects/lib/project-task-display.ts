import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import type { ProjectTaskApi } from '../types/project.types';

export const TASK_ICON_TONES = [
  'starium-dt-ti-neutral',
  'starium-dt-ti-blue',
  'starium-dt-ti-purple',
  'starium-dt-ti-gold',
  'starium-dt-ti-green',
] as const;

export const TASK_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
export const DEFAULT_TASK_PAGE_SIZE = 10;

export function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }
  if (currentPage >= totalPages - 2) {
    return [
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export function taskAssigneeShortLabel(task: ProjectTaskApi): string {
  const resource = task.responsibleResource;
  if (resource?.firstName && resource?.name) {
    return `${resource.firstName} ${resource.name.charAt(0)}.`;
  }
  if (resource?.name) return resource.name;
  return '—';
}

export function taskAssigneeDisplayName(task: ProjectTaskApi): string {
  const resource = task.responsibleResource;
  if (resource?.firstName && resource?.name) {
    return `${resource.firstName} ${resource.name}`;
  }
  return resource?.name ?? 'Non assignée';
}

export function taskStatusBadgeClass(status: string, isLate: boolean | undefined): string {
  if (isLate && status !== 'DONE' && status !== 'CANCELLED') {
    return 'starium-ds-badge--danger';
  }
  switch (status) {
    case 'IN_PROGRESS':
      return 'starium-ds-badge--success';
    case 'BLOCKED':
      return 'starium-ds-badge--danger';
    case 'DONE':
      return 'starium-ds-badge--success';
    case 'TODO':
    case 'DRAFT':
      return 'starium-ds-badge--info';
    default:
      return 'starium-ds-badge--neutral';
  }
}

export function taskStatusBadgeLabel(status: string, isLate: boolean | undefined): string {
  if (isLate && status !== 'DONE' && status !== 'CANCELLED') {
    return 'En retard';
  }
  return TASK_STATUS_LABEL[status] ?? status;
}

export function taskPriorityFlagClass(priority: string): string {
  if (priority === 'HIGH' || priority === 'CRITICAL') return 'starium-dt-flag--haute';
  if (priority === 'LOW') return 'starium-dt-flag--basse';
  return 'starium-dt-flag--moyenne';
}

export function taskProgressFillClass(progress: number, isLate: boolean | undefined): string {
  if (isLate) return 'starium-dt-prog-fill--bad';
  if (progress >= 80) return 'starium-dt-prog-fill--ok';
  if (progress >= 40) return 'starium-dt-prog-fill--warn';
  return 'starium-dt-prog-fill--blue';
}

export function computeTaskStats(tasks: ProjectTaskApi[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const blocked = tasks.filter((t) => t.status === 'BLOCKED' || t.isLate).length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return {
    total,
    done,
    inProgress,
    blocked,
    donePct: pct(done),
    inProgressPct: pct(inProgress),
    blockedPct: pct(blocked),
  };
}

export function sortTasksForList(tasks: ProjectTaskApi[]): ProjectTaskApi[] {
  return [...tasks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'fr');
  });
}
