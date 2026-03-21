import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  CreateProjectBudgetLinkPayload,
  ProjectBudgetLinksPage,
} from '../types/project.types';

const BASE_PROJECTS = '/api/projects';
const BASE_LINKS = '/api/project-budget-links';

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export async function listProjectBudgetLinks(
  authFetch: AuthFetch,
  projectId: string,
  params?: { limit?: number; offset?: number },
): Promise<ProjectBudgetLinksPage> {
  const res = await authFetch(
    `${BASE_PROJECTS}/${projectId}/budget-links${qs(params)}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectBudgetLinksPage>;
}

export async function createProjectBudgetLink(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectBudgetLinkPayload,
): Promise<ProjectBudgetLinksPage['items'][0]> {
  const res = await authFetch(`${BASE_PROJECTS}/${projectId}/budget-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectBudgetLinksPage['items'][0]>;
}

export async function deleteProjectBudgetLink(
  authFetch: AuthFetch,
  linkId: string,
): Promise<void> {
  const res = await authFetch(`${BASE_LINKS}/${linkId}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}
