import type { TeamResourceAssignmentsListParams } from '../types/team-assignment.types';

export type AssignmentDateFilterMode = 'none' | 'range' | 'activeOn';

export type AssignmentListFilterInput = {
  collaboratorId?: string;
  projectId?: string;
  activityTypeId?: string;
  includeCancelled: boolean;
  limit: number;
  offset: number;
  dateMode: AssignmentDateFilterMode;
  /** YYYY-MM-DD — utilisés si dateMode === 'range' (tous deux requis côté UI). */
  from?: string;
  to?: string;
  /** YYYY-MM-DD — utilisé si dateMode === 'activeOn'. */
  activeOn?: string;
};

/**
 * Construit les query params API à partir du state UI (exclusivité activeOn vs from/to).
 */
export function toTeamAssignmentsListParams(
  input: AssignmentListFilterInput,
): TeamResourceAssignmentsListParams {
  const base: TeamResourceAssignmentsListParams = {
    limit: input.limit,
    offset: input.offset,
    includeCancelled: input.includeCancelled,
  };
  if (input.collaboratorId?.trim()) {
    base.collaboratorId = input.collaboratorId.trim();
  }
  if (input.projectId?.trim()) {
    base.projectId = input.projectId.trim();
  }
  if (input.activityTypeId?.trim()) {
    base.activityTypeId = input.activityTypeId.trim();
  }
  if (input.dateMode === 'activeOn' && input.activeOn?.trim()) {
    base.activeOn = input.activeOn.trim();
    return base;
  }
  if (input.dateMode === 'range' && input.from?.trim() && input.to?.trim()) {
    base.from = input.from.trim();
    base.to = input.to.trim();
  }
  return base;
}
