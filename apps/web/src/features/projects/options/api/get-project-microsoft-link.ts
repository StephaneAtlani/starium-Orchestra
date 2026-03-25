import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { ProjectMicrosoftLinkDto } from '../types/project-options.types';

const BASE = '/api/projects';

/** 404 → `null` (aucune ligne ProjectMicrosoftLink). */
export async function getProjectMicrosoftLink(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectMicrosoftLinkDto | null> {
  const res = await authFetch(`${BASE}/${projectId}/microsoft-link`);
  if (res.status === 404) return null;
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftLinkDto>;
}
