import { MILESTONE_STATUS_LABEL } from '../constants/project-enum-labels';
import type { ProjectAssignableUser, ProjectMilestoneApi } from '../types/project.types';
import { TASK_ICON_TONES } from './project-task-display';

export const MILESTONE_ICON_TONES = TASK_ICON_TONES;

export const MILESTONE_LABEL_TAG_TONES = [
  'bg-violet-500/15 text-violet-900 dark:text-violet-300',
  'bg-amber-500/15 text-amber-950 dark:text-amber-300',
  'bg-sky-500/15 text-sky-950 dark:text-sky-300',
  'bg-emerald-500/15 text-emerald-900 dark:text-emerald-300',
] as const;

export function formatMilestoneDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function assignableUserDisplayName(user: ProjectAssignableUser): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.email;
}

export function assignableUserShortLabel(user: ProjectAssignableUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName.charAt(0)}.`;
  }
  if (user.lastName) return user.lastName;
  if (user.firstName) return user.firstName;
  return user.email;
}

export function resolveMilestoneLabelNames(
  labelIds: string[] | undefined,
  labelNameById: Map<string, string>,
): string[] {
  if (!labelIds?.length) return [];
  return labelIds
    .map((id) => labelNameById.get(id))
    .filter((name): name is string => Boolean(name));
}

export function computeMilestoneStats(milestones: ProjectMilestoneApi[]) {
  const total = milestones.length;
  const planned = milestones.filter((m) => m.status === 'PLANNED').length;
  const achieved = milestones.filter((m) => m.status === 'ACHIEVED').length;
  const delayed = milestones.filter((m) => m.status === 'DELAYED').length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return {
    total,
    planned,
    achieved,
    delayed,
    plannedPct: pct(planned),
    achievedPct: pct(achieved),
    delayedPct: pct(delayed),
  };
}

export function milestoneStatusDsBadgeClass(status: string): string {
  switch (status) {
    case 'ACHIEVED':
      return 'starium-ds-badge--success';
    case 'DELAYED':
      return 'starium-ds-badge--danger';
    case 'CANCELLED':
      return 'starium-ds-badge--neutral';
    default:
      return 'starium-ds-badge--info';
  }
}

export function milestoneStatusLabel(status: string): string {
  return MILESTONE_STATUS_LABEL[status] ?? status;
}

export function milestoneDateIsLate(status: string): boolean {
  return status === 'DELAYED';
}
