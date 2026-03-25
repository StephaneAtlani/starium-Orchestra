import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ProjectMicrosoftLinkDto,
  UpdateProjectMicrosoftLinkPayload,
} from '../types/project-options.types';

const BASE = '/api/projects';

export async function updateProjectMicrosoftLink(
  authFetch: AuthFetch,
  projectId: string,
  body: UpdateProjectMicrosoftLinkPayload,
): Promise<ProjectMicrosoftLinkDto> {
  const res = await authFetch(`${BASE}/${projectId}/microsoft-link`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMicrosoftLinkDto>;
}
