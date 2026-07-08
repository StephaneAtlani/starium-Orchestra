import type {
  StrategicObjectiveDto,
  StrategicObjectiveStatus,
} from '../types/strategic-vision.types';

export type StrategicTone = 'success' | 'warning' | 'danger';

/**
 * Avancement dérivé du statut (aucune métrique numérique en base).
 * Sert d'indicateur visuel de santé, pas d'un pourcentage de complétion réel.
 */
const STATUS_PROGRESS: Record<StrategicObjectiveStatus, number> = {
  COMPLETED: 100,
  ON_TRACK: 75,
  AT_RISK: 45,
  OFF_TRACK: 20,
  ARCHIVED: 0,
};

export function objectiveProgress(status: StrategicObjectiveStatus): number {
  return STATUS_PROGRESS[status];
}

export function objectiveTone(status: StrategicObjectiveStatus): StrategicTone {
  switch (status) {
    case 'COMPLETED':
    case 'ON_TRACK':
      return 'success';
    case 'AT_RISK':
      return 'warning';
    case 'OFF_TRACK':
    case 'ARCHIVED':
    default:
      return 'danger';
  }
}

/** Moyenne d'avancement des objectifs non archivés d'un axe (0 si aucun). */
export function axisProgress(objectives: StrategicObjectiveDto[]): number {
  const active = objectives.filter((o) => o.status !== 'ARCHIVED');
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, o) => acc + objectiveProgress(o.status), 0);
  return Math.round(sum / active.length);
}

export function progressTone(pct: number): StrategicTone {
  if (pct >= 75) return 'success';
  if (pct >= 50) return 'warning';
  return 'danger';
}

export function toneColorVar(tone: StrategicTone): string {
  return {
    success: 'var(--state-success)',
    warning: 'var(--state-warning)',
    danger: 'var(--state-danger)',
  }[tone];
}

export function toneProgressFillClass(tone: StrategicTone): string {
  return {
    success: 'starium-progress-fill--ok',
    warning: 'starium-progress-fill--warn',
    danger: 'starium-progress-fill--danger',
  }[tone];
}

export function toneStatusLabel(tone: StrategicTone): string {
  return {
    success: 'En bonne trajectoire',
    warning: 'Attention requise',
    danger: 'En retard',
  }[tone];
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
