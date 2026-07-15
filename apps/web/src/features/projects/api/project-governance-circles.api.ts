import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { ProjectGovernanceCircleApi } from '../types/project.types';

const BASE = '/api/projects';

export type ListProjectGovernanceCirclesResponse = {
  items: ProjectGovernanceCircleApi[];
};

export async function listProjectGovernanceCircles(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ListProjectGovernanceCirclesResponse> {
  const res = await authFetch(`${BASE}/${projectId}/governance-circles`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ListProjectGovernanceCirclesResponse>;
}

export async function createProjectGovernanceCircle(
  authFetch: AuthFetch,
  projectId: string,
  body: { name: string; sortOrder?: number },
): Promise<ProjectGovernanceCircleApi> {
  const res = await authFetch(`${BASE}/${projectId}/governance-circles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectGovernanceCircleApi>;
}

export async function deleteProjectGovernanceCircle(
  authFetch: AuthFetch,
  projectId: string,
  circleId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${projectId}/governance-circles/${circleId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}
