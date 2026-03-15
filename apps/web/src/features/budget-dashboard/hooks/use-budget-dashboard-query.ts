'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getBudgetDashboard } from '../api/get-budget-dashboard';
import type { BudgetDashboardQueryParams } from '../types/budget-dashboard.types';

export function useBudgetDashboardQuery(params?: BudgetDashboardQueryParams) {
  const { accessToken } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: ['budget-dashboard', params],
    queryFn: () => getBudgetDashboard(authenticatedFetch, params),
    enabled: !!accessToken,
  });
}
