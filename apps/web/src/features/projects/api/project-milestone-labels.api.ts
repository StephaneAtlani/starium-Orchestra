import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { ProjectMilestoneLabelApi } from '../types/project.types';

const BASE = '/api/projects';

export async function listProjectMilestoneLabels(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectMilestoneLabelApi[]> {
  const res = await authFetch(`${BASE}/${projectId}/milestone-labels`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMilestoneLabelApi[]>;
}

export type CreateProjectMilestoneLabelPayload = {
  name: string;
  color?: string;
};

export async function createProjectMilestoneLabel(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectMilestoneLabelPayload,
): Promise<ProjectMilestoneLabelApi> {
  const res = await authFetch(`${BASE}/${projectId}/milestone-labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMilestoneLabelApi>;
}

export async function deleteProjectMilestoneLabel(
  authFetch: AuthFetch,
  projectId: string,
  labelId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${projectId}/milestone-labels/${labelId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

