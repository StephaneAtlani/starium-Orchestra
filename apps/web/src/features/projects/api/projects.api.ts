import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ProjectDetail,
  ProjectsListResponse,
  ProjectsPortfolioSummary,
} from '../types/project.types';

const BASE = '/api/projects';

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export async function getPortfolioSummary(
  authFetch: AuthFetch,
): Promise<ProjectsPortfolioSummary> {
  const res = await authFetch(`${BASE}/portfolio-summary`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectsPortfolioSummary>;
}

export async function listProjects(
  authFetch: AuthFetch,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    kind?: string;
    status?: string;
    priority?: string;
    criticality?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    atRiskOnly?: boolean;
  },
): Promise<ProjectsListResponse> {
  const res = await authFetch(`${BASE}${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectsListResponse>;
}

export async function getProject(
  authFetch: AuthFetch,
  id: string,
): Promise<ProjectDetail> {
  const res = await authFetch(`${BASE}/${id}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDetail>;
}

export async function createProject(
  authFetch: AuthFetch,
  body: Record<string, unknown>,
): Promise<ProjectDetail> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDetail>;
}

export async function updateProject(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
): Promise<ProjectDetail> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDetail>;
}

export async function deleteProject(authFetch: AuthFetch, id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function listTasks(authFetch: AuthFetch, projectId: string) {
  const res = await authFetch(`${BASE}/${projectId}/tasks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<unknown[]>;
}

export async function listRisks(authFetch: AuthFetch, projectId: string) {
  const res = await authFetch(`${BASE}/${projectId}/risks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<unknown[]>;
}

export async function listMilestones(authFetch: AuthFetch, projectId: string) {
  const res = await authFetch(`${BASE}/${projectId}/milestones`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<unknown[]>;
}
