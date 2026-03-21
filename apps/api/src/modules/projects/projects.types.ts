export type ComputedHealth = 'GREEN' | 'ORANGE' | 'RED';

export type ProjectSignalsDto = {
  isLate: boolean;
  isBlocked: boolean;
  hasNoOwner: boolean;
  hasNoTasks: boolean;
  hasNoRisks: boolean;
  hasNoMilestones: boolean;
  hasPlanningDrift: boolean;
  isCritical: boolean;
};

export const PROJECT_WARNING_CODES = [
  'NO_OWNER',
  'NO_TASKS',
  'NO_RISKS',
  'NO_MILESTONES',
  'PLANNING_DRIFT',
  'BLOCKED',
] as const;

export type ProjectWarningCode = (typeof PROJECT_WARNING_CODES)[number];
