import type { CollaboratorsListParams } from '../types/collaborator.types';

export const collaboratorQueryKeys = {
  all: ['teams', 'collaborators'] as const,
  list: (clientId: string, params: CollaboratorsListParams) =>
    [...collaboratorQueryKeys.all, 'list', clientId, params] as const,
  detail: (clientId: string, collaboratorId: string) =>
    [...collaboratorQueryKeys.all, 'detail', clientId, collaboratorId] as const,
  managerOptions: (
    clientId: string,
    params: { search?: string; offset?: number; limit?: number },
  ) => [...collaboratorQueryKeys.all, 'manager-options', clientId, params] as const,
};

