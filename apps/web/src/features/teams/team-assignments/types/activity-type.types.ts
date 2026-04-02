import type { ActivityTaxonomyKind } from './team-assignment.types';

export type ActivityTypeListItem = {
  id: string;
  clientId: string;
  kind: ActivityTaxonomyKind;
  name: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  isDefaultForKind: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTypesListResponse = {
  items: ActivityTypeListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ActivityTypesListParams = {
  search?: string;
  kind?: ActivityTaxonomyKind;
  includeArchived?: boolean;
  offset?: number;
  limit?: number;
};
