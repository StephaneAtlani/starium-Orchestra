'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { BudgetExercisesListParams, BudgetsListParams } from '../types/budget-list.types';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../constants/budget-filters';

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

export function useBudgetExercisesListFilters(): {
  filters: BudgetExercisesListParams;
  setFilters: (updates: Partial<BudgetExercisesListParams>) => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo((): BudgetExercisesListParams => {
    const search = searchParams.get('search') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const page = parseNumber(searchParams.get('page'), DEFAULT_PAGE);
    const limit = parseNumber(searchParams.get('limit'), DEFAULT_LIMIT);
    return {
      search: search || undefined,
      status: (status === 'ALL' || !status ? 'ALL' : status) as BudgetExercisesListParams['status'],
      page,
      limit,
    };
  }, [searchParams]);

  const buildUrl = useCallback(
    (next: BudgetExercisesListParams) => {
      const params = new URLSearchParams();
      if (next.search?.trim()) params.set('search', next.search.trim());
      if (next.status && next.status !== 'ALL') params.set('status', next.status);
      if (next.page != null && next.page !== DEFAULT_PAGE) params.set('page', String(next.page));
      if (next.limit != null && next.limit !== DEFAULT_LIMIT) params.set('limit', String(next.limit));
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname],
  );

  const setFilters = useCallback(
    (updates: Partial<BudgetExercisesListParams>) => {
      const next = { ...filters, ...updates };
      if (
        ('search' in updates || 'status' in updates) &&
        updates.page === undefined
      ) {
        next.page = 1;
      }
      router.replace(buildUrl(next));
    },
    [filters, buildUrl, router],
  );

  const reset = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { filters, setFilters, reset };
}

export function useBudgetsListFilters(): {
  filters: BudgetsListParams;
  setFilters: (updates: Partial<BudgetsListParams>) => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo((): BudgetsListParams => {
    const search = searchParams.get('search') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const exerciseId = searchParams.get('exerciseId') ?? undefined;
    const page = parseNumber(searchParams.get('page'), DEFAULT_PAGE);
    const limit = parseNumber(searchParams.get('limit'), DEFAULT_LIMIT);
    return {
      search: search || undefined,
      exerciseId: exerciseId || undefined,
      status: (status === 'ALL' || !status ? 'ALL' : status) as BudgetsListParams['status'],
      page,
      limit,
    };
  }, [searchParams]);

  const buildUrl = useCallback(
    (next: BudgetsListParams) => {
      const params = new URLSearchParams();
      if (next.search?.trim()) params.set('search', next.search.trim());
      if (next.exerciseId) params.set('exerciseId', next.exerciseId);
      if (next.status && next.status !== 'ALL') params.set('status', next.status);
      if (next.page != null && next.page !== DEFAULT_PAGE) params.set('page', String(next.page));
      if (next.limit != null && next.limit !== DEFAULT_LIMIT) params.set('limit', String(next.limit));
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname],
  );

  const setFilters = useCallback(
    (updates: Partial<BudgetsListParams>) => {
      const next = { ...filters, ...updates };
      if (
        ('search' in updates || 'status' in updates || 'exerciseId' in updates) &&
        updates.page === undefined
      ) {
        next.page = 1;
      }
      router.replace(buildUrl(next));
    },
    [filters, buildUrl, router],
  );

  const reset = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { filters, setFilters, reset };
}
