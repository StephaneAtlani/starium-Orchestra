import type { StrategicAxisDto } from '../types/strategic-vision.types';
import { axisProgress, progressTone, type StrategicTone } from './strategic-overview-progress';

export function axisObjectiveTrajectoryCounts(axis: StrategicAxisDto): {
  onTrajectory: number;
  total: number;
} {
  const active = axis.objectives.filter((objective) => objective.status !== 'ARCHIVED');
  const onTrajectory = active.filter(
    (objective) => objective.status === 'ON_TRACK' || objective.status === 'COMPLETED',
  );
  return { onTrajectory: onTrajectory.length, total: active.length };
}

export function countAxesOnTrack(axes: StrategicAxisDto[]): number {
  return axes.filter((axis) => progressTone(axisProgress(axis.objectives)) === 'success').length;
}

export function trajectoryBadgeClass(tone: StrategicTone): string {
  switch (tone) {
    case 'success':
      return 'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]';
    case 'warning':
      return 'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning)]';
    case 'danger':
      return 'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]';
  }
}

export function formatVisionReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function paginateOverviewItems<T>(
  items: T[],
  page: number,
  pageSize: number,
) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    total,
    totalPages,
    safePage,
    start,
    pageItems: items.slice(start, start + pageSize),
  };
}
