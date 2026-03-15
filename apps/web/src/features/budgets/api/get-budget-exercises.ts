/**
 * API liste exercices budgétaires — params avec page, mapping vers offset (RFC-FE-003).
 */

import type { AuthFetch } from './budget-management.api';
import { listExercises } from './budget-management.api';
import type { BudgetExercisesListParams, BudgetExerciseSummary, ListResult } from '../types/budget-list.types';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../constants/budget-filters';

function toSummary(item: {
  id: string;
  name: string;
  code: string | null;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}): BudgetExerciseSummary {
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    startDate: item.startDate,
    endDate: item.endDate,
    status: item.status as BudgetExerciseSummary['status'],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getBudgetExercises(
  authFetch: AuthFetch,
  params: BudgetExercisesListParams,
): Promise<ListResult<BudgetExerciseSummary>> {
  const page = params.page ?? DEFAULT_PAGE;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const query: { search?: string; status?: string; offset: number; limit: number } = {
    offset,
    limit,
  };
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.status && params.status !== 'ALL') query.status = params.status;

  const res = await listExercises(authFetch, query);
  return {
    items: res.items.map(toSummary),
    total: res.total,
    limit: res.limit,
    offset: res.offset,
  };
}
