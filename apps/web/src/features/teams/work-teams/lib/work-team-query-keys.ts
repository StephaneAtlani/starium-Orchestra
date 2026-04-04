import type { ManagerScopePreviewParams } from '../types/work-team.types';
import type { WorkTeamMembersParams } from '../types/work-team.types';
import type { WorkTeamsListParams } from '../types/work-team.types';
import type { WorkTeamsTreeParams } from '../types/work-team.types';

export const workTeamQueryKeys = {
  all: ['teams', 'work-teams'] as const,
  list: (clientId: string, params: WorkTeamsListParams) =>
    [...workTeamQueryKeys.all, 'list', clientId, params] as const,
  tree: (clientId: string, params: WorkTeamsTreeParams) =>
    [...workTeamQueryKeys.all, 'tree', clientId, params] as const,
  detail: (clientId: string, teamId: string) =>
    [...workTeamQueryKeys.all, 'detail', clientId, teamId] as const,
  members: (clientId: string, teamId: string, params: WorkTeamMembersParams) =>
    [...workTeamQueryKeys.all, 'members', clientId, teamId, params] as const,
  managerScope: (clientId: string, managerResourceId: string) =>
    [...workTeamQueryKeys.all, 'manager-scope', clientId, managerResourceId] as const,
  managerScopePreview: (
    clientId: string,
    managerResourceId: string,
    params: ManagerScopePreviewParams,
  ) =>
    [
      ...workTeamQueryKeys.all,
      'manager-scope-preview',
      clientId,
      managerResourceId,
      params,
    ] as const,
};
