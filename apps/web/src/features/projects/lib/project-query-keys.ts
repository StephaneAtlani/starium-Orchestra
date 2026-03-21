import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';

export const projectQueryKeys = {
  all: ['projects'] as const,
  summary: (clientId: string) => [...projectQueryKeys.all, 'summary', clientId] as const,
  assignableUsers: (clientId: string) =>
    [...projectQueryKeys.all, 'assignable-users', clientId] as const,
  list: (clientId: string, params: ProjectsListFilters | Record<string, unknown>) =>
    [...projectQueryKeys.all, 'list', clientId, params] as const,
  detail: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'detail', clientId, projectId] as const,
  tasks: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'tasks', clientId, projectId] as const,
  risks: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'risks', clientId, projectId] as const,
  milestones: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'milestones', clientId, projectId] as const,
  budgetLinks: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'budget-links', clientId, projectId] as const,
};
