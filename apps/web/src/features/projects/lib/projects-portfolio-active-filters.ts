import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';

export function countActivePortfolioFilters(filters: ProjectsListFilters): number {
  let count = 0;
  if (filters.search?.trim()) count += 1;
  if (filters.portfolioCategoryId) count += 1;
  if (filters.kind) count += 1;
  if (filters.status) count += 1;
  if (filters.computedHealth) count += 1;
  if (filters.myRole) count += 1;
  if (filters.ownerUserId) count += 1;
  if (filters.lateOnly) count += 1;
  if (filters.atRiskOnly) count += 1;
  if (filters.myProjectsOnly) count += 1;
  if (filters.parentProjectId) count += 1;
  if (filters.rootOnly) count += 1;
  if ((filters.tagIds?.length ?? 0) > 0) count += 1;
  if (filters.sortBy !== 'targetEndDate' || filters.sortOrder !== 'asc') count += 1;
  return count;
}
