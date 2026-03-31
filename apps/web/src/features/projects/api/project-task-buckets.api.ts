import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';

const BASE = '/api/projects';

export type ProjectTaskBucketApi = {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  sortOrder: number;
  plannerBucketId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListProjectTaskBucketsResponse = {
  items: ProjectTaskBucketApi[];
  useMicrosoftPlannerBuckets: boolean;
};

export async function listProjectTaskBuckets(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ListProjectTaskBucketsResponse> {
  const res = await authFetch(`${BASE}/${projectId}/task-buckets`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ListProjectTaskBucketsResponse>;
}

export type CreateProjectTaskBucketPayload = {
  name: string;
  sortOrder?: number;
};

export async function createProjectTaskBucket(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectTaskBucketPayload,
): Promise<ProjectTaskBucketApi> {
  const res = await authFetch(`${BASE}/${projectId}/task-buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskBucketApi>;
}

export async function deleteProjectTaskBucket(
  authFetch: AuthFetch,
  projectId: string,
  bucketId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${projectId}/task-buckets/${bucketId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}
