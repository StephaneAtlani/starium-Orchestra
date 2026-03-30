import { ProjectMilestoneStatus, ProjectTaskStatus } from '@prisma/client';

/** Début de la journée courante en UTC (ms). */
export function utcStartOfTodayMs(now: Date = new Date()): number {
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
}

export type TaskIsLateInput = {
  status: ProjectTaskStatus;
  plannedEndDate: Date | null;
};

/**
 * Normatif RFC Gantt : retard sur échéance planifiée (UTC).
 * BLOCKED est inclus si la date est dépassée.
 */
export function computeIsLateTask(
  task: TaskIsLateInput,
  now: Date = new Date(),
): boolean {
  if (
    task.status === ProjectTaskStatus.DONE ||
    task.status === ProjectTaskStatus.CANCELLED
  ) {
    return false;
  }
  if (!task.plannedEndDate) return false;
  const endMs = task.plannedEndDate.getTime();
  return endMs < utcStartOfTodayMs(now);
}

export type MilestoneIsLateInput = {
  status: ProjectMilestoneStatus;
  targetDate: Date;
};

export function computeIsLateMilestone(
  m: MilestoneIsLateInput,
  now: Date = new Date(),
): boolean {
  if (
    m.status === ProjectMilestoneStatus.ACHIEVED ||
    m.status === ProjectMilestoneStatus.CANCELLED
  ) {
    return false;
  }
  const t = m.targetDate.getTime();
  return t < utcStartOfTodayMs(now);
}
