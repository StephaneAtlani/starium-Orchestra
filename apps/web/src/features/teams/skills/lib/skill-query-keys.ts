import type {
  SkillCategoriesListParams,
  SkillCollaboratorsListParams,
  SkillsListParams,
} from '../types/skill.types';

export const skillQueryKeys = {
  root: (clientId: string) => ['teams', clientId, 'skills'] as const,

  list: (clientId: string, params: SkillsListParams) =>
    [...skillQueryKeys.root(clientId), 'list', params] as const,

  detail: (clientId: string, skillId: string) =>
    [...skillQueryKeys.root(clientId), 'detail', skillId] as const,

  categoriesRoot: (clientId: string) =>
    ['teams', clientId, 'skill-categories'] as const,

  categoriesList: (clientId: string, params: SkillCategoriesListParams) =>
    [...skillQueryKeys.categoriesRoot(clientId), 'list', params] as const,

  categoryOptions: (clientId: string) =>
    [...skillQueryKeys.categoriesRoot(clientId), 'options'] as const,

  skillOptions: (clientId: string) =>
    [...skillQueryKeys.root(clientId), 'options'] as const,

  skillCollaborators: (
    clientId: string,
    skillId: string,
    params: SkillCollaboratorsListParams,
  ) =>
    [
      ...skillQueryKeys.root(clientId),
      'collaborators-for-skill',
      skillId,
      params,
    ] as const,
};
