'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BudgetExercisesListParams, BudgetsListParams, PortfolioViewMode } from '../types/budget-list.types';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../constants/budget-filters';

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function parseBudgetsFilters(searchParams: URLSearchParams): Partial<BudgetsListParams> {
  const search = searchParams.get('search') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const exerciseId = searchParams.get('exerciseId') ?? undefined;
  const rawView = searchParams.get('view');
  const view: PortfolioViewMode = rawView === 'cards' ? 'cards' : 'table';
  const page = parseNumber(searchParams.get('page'), DEFAULT_PAGE);
  const limit = parseNumber(searchParams.get('limit'), DEFAULT_LIMIT);
  return {
    search: search || undefined,
    exerciseId: exerciseId || undefined,
    status: (status === 'ALL' || !status ? 'ALL' : status) as BudgetsListParams['status'],
    view,
    page,
    limit,
  };
}

function buildBudgetsFiltersUrl(pathname: string, next: BudgetsListParams): string {
  const params = new URLSearchParams();
  if (next.search?.trim()) params.set('search', next.search.trim());
  if (next.exerciseId) params.set('exerciseId', next.exerciseId);
  if (next.status && next.status !== 'ALL') params.set('status', next.status);
  if (next.view && next.view !== 'table') params.set('view', next.view);
  if (next.page != null && next.page !== DEFAULT_PAGE) params.set('page', String(next.page));
  if (next.limit != null && next.limit !== DEFAULT_LIMIT) params.set('limit', String(next.limit));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function syncBudgetsFiltersToUrl(pathname: string, filters: BudgetsListParams): void {
  if (typeof window === 'undefined') return;
  const url = buildBudgetsFiltersUrl(pathname, filters);
  window.history.replaceState(window.history.state, '', url);
}

const DEFAULT_BUDGETS_FILTERS = (): BudgetsListParams => ({
  search: undefined,
  exerciseId: undefined,
  status: 'ALL',
  view: 'table',
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
});

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const urlFilters = useMemo(
    () => parseBudgetsFilters(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clé sérialisée, pas l'objet searchParams
    [searchKey],
  );

  const [filters, setFiltersState] = useState<BudgetsListParams>(() => ({
    ...DEFAULT_BUDGETS_FILTERS(),
    ...urlFilters,
  }));

  /** Navigation Next.js (lien entrant) — pas les mises à jour locales replaceState. */
  useEffect(() => {
    setFiltersState((prev) => ({ ...prev, ...urlFilters }));
  }, [urlFilters]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setFiltersState((prev) => ({ ...prev, ...parseBudgetsFilters(params) }));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setFilters = useCallback(
    (updates: Partial<BudgetsListParams>) => {
      setFiltersState((prev) => {
        const next: BudgetsListParams = { ...prev, ...updates };
        if (
          ('search' in updates || 'status' in updates || 'exerciseId' in updates) &&
          updates.page === undefined
        ) {
          next.page = 1;
        }
        syncBudgetsFiltersToUrl(pathname, next);
        return next;
      });
    },
    [pathname],
  );

  const reset = useCallback(() => {
    const next = DEFAULT_BUDGETS_FILTERS();
    setFiltersState(next);
    syncBudgetsFiltersToUrl(pathname, next);
  }, [pathname]);

  return { filters, setFilters, reset };
}
