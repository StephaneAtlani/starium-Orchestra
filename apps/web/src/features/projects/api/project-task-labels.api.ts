import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { ProjectTaskLabelApi } from '../types/project.types';

const BASE = '/api/projects';

export async function listProjectTaskLabels(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectTaskLabelApi[]> {
  const res = await authFetch(`${BASE}/${projectId}/task-labels`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskLabelApi[]>;
}

export type CreateProjectTaskLabelPayload = {
  name: string;
  color?: string;
};

export async function createProjectTaskLabel(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectTaskLabelPayload,
): Promise<ProjectTaskLabelApi> {
  const res = await authFetch(`${BASE}/${projectId}/task-labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskLabelApi>;
}

export async function deleteProjectTaskLabel(
  authFetch: AuthFetch,
  projectId: string,
  labelId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${projectId}/task-labels/${labelId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

