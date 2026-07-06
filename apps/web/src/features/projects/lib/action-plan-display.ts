import {
  PROJECT_ENTITY_PRIORITY_KEYS,
  type ProjectEntityPriorityKey,
  type ProjectLifecycleStatusKey,
} from '@/lib/ui/badge-registry';
import type { ActionPlanApi } from '../types/project.types';

export const ACTION_PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export const ACTION_PLAN_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

export const ACTION_PLAN_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'ON_HOLD', label: 'En pause' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'CANCELLED', label: 'Annulé' },
] as const;

export const ACTION_PLAN_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Basse' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Haute' },
] as const;

/** Style = cycle de vie projet (RFC-PLA-001 `ACTIVE` ≈ `IN_PROGRESS`). */
export function actionPlanStatusToLifecycleKey(
  status: string,
): ProjectLifecycleStatusKey {
  const m: Record<string, ProjectLifecycleStatusKey> = {
    DRAFT: 'DRAFT',
    ACTIVE: 'IN_PROGRESS',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  };
  return m[status] ?? 'DRAFT';
}

export function actionPlanStatusLabel(status: string): string {
  return ACTION_PLAN_STATUS_LABELS[status] ?? status;
}

export function actionPlanPriorityLabel(priority: string): string {
  return ACTION_PLAN_PRIORITY_LABELS[priority] ?? priority;
}

export function isKnownActionPlanPriority(
  priority: string,
): priority is ProjectEntityPriorityKey {
  return (PROJECT_ENTITY_PRIORITY_KEYS as readonly string[]).includes(priority);
}

export function actionPlanOwnerLabel(plan: ActionPlanApi): string {
  if (!plan.owner) return 'Non assigné';
  const name = [plan.owner.firstName, plan.owner.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || plan.owner.email;
}

export function fmtActionPlanShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export function computeActionPlanListStats(items: ActionPlanApi[]) {
  const total = items.length;
  const active = items.filter((p) => p.status === 'ACTIVE').length;
  const onHold = items.filter((p) => p.status === 'ON_HOLD').length;
  const unassigned = items.filter((p) => !p.ownerUserId).length;
  const avgProgress =
    total > 0
      ? Math.round(
          items.reduce((sum, plan) => sum + (plan.progressPercent ?? 0), 0) / total,
        )
      : 0;

  return { total, active, onHold, unassigned, avgProgress };
}

/** Code métier unique : dérivé du titre (sans accents), préfixe PA-. */
export function suggestActionPlanCodeFromTitle(title: string): string {
  const raw = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  if (raw.length >= 2) {
    return `PA-${raw}`;
  }
  return `PA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
