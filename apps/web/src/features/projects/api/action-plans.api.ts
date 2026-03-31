import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ActionPlanApi,
  ActionPlanTaskApi,
  PaginatedList,
} from '../types/project.types';

const BASE = '/api/action-plans';

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export async function listActionPlans(
  authFetch: AuthFetch,
  params?: { search?: string; offset?: number; limit?: number },
): Promise<PaginatedList<ActionPlanApi>> {
  const res = await authFetch(`${BASE}${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedList<ActionPlanApi>>;
}

export async function getActionPlan(
  authFetch: AuthFetch,
  id: string,
): Promise<ActionPlanApi> {
  const res = await authFetch(`${BASE}/${id}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ActionPlanApi>;
}

export type CreateActionPlanPayload = {
  title: string;
  code: string;
  description?: string | null;
  status: string;
  priority: string;
  ownerUserId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
};

export async function createActionPlan(
  authFetch: AuthFetch,
  payload: CreateActionPlanPayload,
): Promise<ActionPlanApi> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ActionPlanApi>;
}

export type UpdateActionPlanPayload = Partial<{
  title: string;
  description: string | null;
  status: string;
  priority: string;
  ownerUserId: string | null;
  startDate: string | null;
  targetDate: string | null;
  progressPercent: number;
}>;

export async function updateActionPlan(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateActionPlanPayload,
): Promise<ActionPlanApi> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ActionPlanApi>;
}

export async function listActionPlanTasks(
  authFetch: AuthFetch,
  actionPlanId: string,
  params?: {
    status?: string;
    priority?: string;
    projectId?: string;
    riskId?: string;
    ownerUserId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
  },
): Promise<PaginatedList<ActionPlanTaskApi>> {
  const res = await authFetch(`${BASE}/${actionPlanId}/tasks${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedList<ActionPlanTaskApi>>;
}

export type CreateActionPlanTaskPayload = {
  name: string;
  description?: string | null;
  code?: string | null;
  status?: string;
  priority?: string;
  progress?: number;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  ownerUserId?: string | null;
  sortOrder?: number;
  projectId?: string | null;
  riskId?: string | null;
  phaseId?: string | null;
  responsibleResourceId?: string | null;
  estimatedHours?: number | null;
  tags?: string[] | null;
};

export async function createActionPlanTask(
  authFetch: AuthFetch,
  actionPlanId: string,
  payload: CreateActionPlanTaskPayload,
): Promise<ActionPlanTaskApi> {
  const res = await authFetch(`${BASE}/${actionPlanId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ActionPlanTaskApi>;
}

export type UpdateActionPlanTaskPayload = Partial<CreateActionPlanTaskPayload>;

export async function updateActionPlanTask(
  authFetch: AuthFetch,
  actionPlanId: string,
  taskId: string,
  payload: UpdateActionPlanTaskPayload,
): Promise<ActionPlanTaskApi> {
  const res = await authFetch(`${BASE}/${actionPlanId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ActionPlanTaskApi>;
}

export async function deleteActionPlanTask(
  authFetch: AuthFetch,
  actionPlanId: string,
  taskId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${actionPlanId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}
