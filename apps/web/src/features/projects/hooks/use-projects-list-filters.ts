'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
] as const;

export type ProjectsSortBy = (typeof SORT_BY_VALUES)[number];

export type ProjectsListFilters = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  priority?: string;
  criticality?: string;
  sortBy: ProjectsSortBy;
  sortOrder: 'asc' | 'desc';
  atRiskOnly: boolean;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo((): ProjectsListFilters => {
    const search = searchParams.get('search') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const priority = searchParams.get('priority') ?? undefined;
    const criticality = searchParams.get('criticality') ?? undefined;
    const page = parseNumber(searchParams.get('page'), PROJECTS_DEFAULT_PAGE);
    const limit = parseNumber(searchParams.get('limit'), PROJECTS_DEFAULT_LIMIT);
    const sortBy = parseSortBy(searchParams.get('sortBy'));
    const sortOrder = parseSortOrder(searchParams.get('sortOrder'));
    const atRiskOnly =
      searchParams.get('atRisk') === 'true' || searchParams.get('atRiskOnly') === 'true';

    return {
      search: search || undefined,
      status: status || undefined,
      priority: priority || undefined,
      criticality: criticality || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
      atRiskOnly,
    };
  }, [searchParams]);

  const buildUrl = useCallback(
    (next: ProjectsListFilters) => {
      const params = new URLSearchParams();
      if (next.search?.trim()) params.set('search', next.search.trim());
      if (next.status) params.set('status', next.status);
      if (next.priority) params.set('priority', next.priority);
      if (next.criticality) params.set('criticality', next.criticality);
      if (next.page != null && next.page !== PROJECTS_DEFAULT_PAGE) {
        params.set('page', String(next.page));
      }
      if (next.limit != null && next.limit !== PROJECTS_DEFAULT_LIMIT) {
        params.set('limit', String(next.limit));
      }
      if (next.sortBy !== 'targetEndDate') params.set('sortBy', next.sortBy);
      if (next.sortOrder !== 'asc') params.set('sortOrder', next.sortOrder);
      if (next.atRiskOnly) params.set('atRisk', 'true');
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname],
  );

  const setFilters = useCallback(
    (updates: Partial<ProjectsListFilters>) => {
      const next: ProjectsListFilters = { ...filters, ...updates };
      if (
        ('search' in updates ||
          'status' in updates ||
          'priority' in updates ||
          'criticality' in updates ||
          'sortBy' in updates ||
          'sortOrder' in updates ||
          'atRiskOnly' in updates) &&
        updates.page === undefined
      ) {
        next.page = PROJECTS_DEFAULT_PAGE;
      }
      router.replace(buildUrl(next));
    },
    [filters, buildUrl, router],
  );

  const reset = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  const apiParams = useMemo(() => {
    return {
      page: filters.page,
      limit: filters.limit,
      ...(filters.search?.trim() && { search: filters.search.trim() }),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.criticality && { criticality: filters.criticality }),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      ...(filters.atRiskOnly && { atRiskOnly: true }),
    };
  }, [filters]);

  return { filters, setFilters, reset, apiParams };
}
