/**
 * API liste budgets — params avec page, mapping vers offset (RFC-FE-003).
 */

import type { AuthFetch } from './budget-management.api';
import { listBudgets } from './budget-management.api';
import type { BudgetsListParams, BudgetSummary, ListResult } from '../types/budget-list.types';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../constants/budget-filters';

function toSummary(item: {
  id: string;
  exerciseId: string;
  name: string;
  code: string | null;
  description?: string | null;
  currency: string;
  status: string;
  ownerUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  exerciseName?: string;
  exerciseCode?: string | null;
}): BudgetSummary {
  return {
    id: item.id,
    exerciseId: item.exerciseId,
    name: item.name,
    code: item.code,
    description: item.description,
    currency: item.currency,
    status: item.status as BudgetSummary['status'],
    ownerUserId: item.ownerUserId ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    exerciseName: item.exerciseName,
    exerciseCode: item.exerciseCode ?? undefined,
  };
}

export async function getBudgets(
  authFetch: AuthFetch,
  params: BudgetsListParams,
): Promise<ListResult<BudgetSummary>> {
  const page = params.page ?? DEFAULT_PAGE;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const query: {
    search?: string;
    status?: string;
    exerciseId?: string;
    ownerUserId?: string;
    offset: number;
    limit: number;
  } = { offset, limit };
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.exerciseId) query.exerciseId = params.exerciseId;
  if (params.ownerUserId) query.ownerUserId = params.ownerUserId;

  const res = await listBudgets(authFetch, query);
  return {
    items: res.items.map(toSummary),
    total: res.total,
    limit: res.limit,
    offset: res.offset,
  };
}
