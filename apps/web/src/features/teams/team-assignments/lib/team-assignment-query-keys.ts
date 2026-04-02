import type {
  ProjectResourceAssignmentsListParams,
  TeamResourceAssignmentsListParams,
} from '../types/team-assignment.types';

export const teamAssignmentQueryKeys = {
  all: ['teams', 'team-assignments'] as const,
  list: (clientId: string, params: TeamResourceAssignmentsListParams) =>
    [...teamAssignmentQueryKeys.all, 'list', clientId, params] as const,
  projectList: (
    clientId: string,
    projectId: string,
    params: ProjectResourceAssignmentsListParams,
  ) =>
    [
      ...teamAssignmentQueryKeys.all,
      'project-list',
      clientId,
      projectId,
      params,
    ] as const,
};
