import type { AccessModelIssueCategory } from './api/access-model.api';

export const accessModelKeys = {
  all: ['access-model'] as const,
  health: () => [...accessModelKeys.all, 'health'] as const,
  issues: (params: {
    category: AccessModelIssueCategory;
    page: number;
    module?: string;
    search?: string;
  }) => [...accessModelKeys.all, 'issues', params] as const,
};
