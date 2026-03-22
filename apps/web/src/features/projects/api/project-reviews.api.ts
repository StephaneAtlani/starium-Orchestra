import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ProjectReviewDetail,
  ProjectReviewListResponse,
} from '../types/project.types';

const base = (projectId: string) => `/api/projects/${projectId}/reviews`;

export async function listProjectReviews(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectReviewListResponse> {
  const res = await authFetch(base(projectId));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewListResponse>;
}

export async function getProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function createProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(base(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function updateProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function finalizeProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/finalize`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function cancelProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}
