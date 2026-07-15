import type { ProjectListItem } from '../types/project.types';

/** Statuts projet pour lesquels la fiche projet est figée (lecture seule). */
export const PROJECT_SHEET_LOCKED_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;

export type ProjectSheetLockedStatus = (typeof PROJECT_SHEET_LOCKED_STATUSES)[number];

export function isProjectSheetEditingLocked(
  status: Pick<ProjectListItem, 'status'>['status'] | string,
): boolean {
  return (PROJECT_SHEET_LOCKED_STATUSES as readonly string[]).includes(status);
}
