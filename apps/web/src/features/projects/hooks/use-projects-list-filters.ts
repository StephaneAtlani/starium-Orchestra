'use client';

import { useCallback, useMemo, useState } from 'react';

export const PROJECTS_DEFAULT_PAGE = 1;
export const PROJECTS_DEFAULT_LIMIT = 20;

const SORT_BY_VALUES = [
  'name',
  'targetEndDate',
  'status',
  'priority',
  'criticality',
  'computedHealth',
  'progressPercent',
  'owner',
] as const;

export type ProjectsSortBy = (typeof SORT_BY_VALUES)[number];

export type ProjectsListFilters = {
  page: number;
  limit: number;
  search?: string;
  /** PROJECT | ACTIVITY */
  kind?: string;
  status?: string;
  priority?: string;
  criticality?: string;
  portfolioCategoryId?: string;
  computedHealth?: 'GREEN' | 'ORANGE' | 'RED';
  myRole?: string;
  /** Filtre par chef de projet (utilisateur client). */
  ownerUserId?: string;
  sortBy: ProjectsSortBy;
  sortOrder: 'asc' | 'desc';
  atRiskOnly: boolean;
  myProjectsOnly: boolean;
};

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function parseSortBy(value: string | null): ProjectsSortBy {
  if (value && (SORT_BY_VALUES as readonly string[]).includes(value)) {
    return value as ProjectsSortBy;
  }
  return 'targetEndDate';
}

function parseSortOrder(value: string | null): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc';
}

export function useProjectsListFilters(): {
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  reset: () => void;
  apiParams: Record<string, string | number | boolean | undefined>;
} {
  const [filters, setFiltersState] = useState<ProjectsListFilters>({
    search: undefined,
    kind: undefined,
    status: undefined,
    priority: undefined,
    criticality: undefined,
    portfolioCategoryId: undefined,
    computedHealth: undefined,
    myRole: undefined,
    ownerUserId: undefined,
    page: PROJECTS_DEFAULT_PAGE,
    limit: PROJECTS_DEFAULT_LIMIT,
    sortBy: 'targetEndDate',
    sortOrder: 'asc',
    atRiskOnly: false,
    myProjectsOnly: false,
  });

  const setFilters = useCallback(
    (updates: Partial<ProjectsListFilters>) => {
      setFiltersState((prev) => {
        const next: ProjectsListFilters = { ...prev, ...updates };
        if (
          ('search' in updates ||
            'kind' in updates ||
            'status' in updates ||
            'priority' in updates ||
            'criticality' in updates ||
            'portfolioCategoryId' in updates ||
            'computedHealth' in updates ||
            'myRole' in updates ||
            'ownerUserId' in updates ||
            'sortBy' in updates ||
            'sortOrder' in updates ||
            'atRiskOnly' in updates ||
            'myProjectsOnly' in updates) &&
          updates.page === undefined
        ) {
          next.page = PROJECTS_DEFAULT_PAGE;
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setFiltersState({
      search: undefined,
      kind: undefined,
      status: undefined,
      priority: undefined,
      criticality: undefined,
      portfolioCategoryId: undefined,
      computedHealth: undefined,
      myRole: undefined,
      ownerUserId: undefined,
      page: PROJECTS_DEFAULT_PAGE,
      limit: PROJECTS_DEFAULT_LIMIT,
      sortBy: 'targetEndDate',
      sortOrder: 'asc',
      atRiskOnly: false,
      myProjectsOnly: false,
    });
  }, []);

  const apiParams = useMemo(() => {
    return {
      page: filters.page,
      limit: filters.limit,
      ...(filters.search?.trim() && { search: filters.search.trim() }),
      ...(filters.kind && { kind: filters.kind }),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.criticality && { criticality: filters.criticality }),
      ...(filters.portfolioCategoryId && {
        portfolioCategoryId: filters.portfolioCategoryId,
      }),
      ...(filters.computedHealth && { computedHealth: filters.computedHealth }),
      ...(filters.myRole && { myRole: filters.myRole }),
      ...(filters.ownerUserId && { ownerUserId: filters.ownerUserId }),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      ...(filters.atRiskOnly && { atRiskOnly: true }),
      ...(filters.myProjectsOnly && { myProjectsOnly: true }),
    };
  }, [filters]);

  return { filters, setFilters, reset, apiParams };
}
