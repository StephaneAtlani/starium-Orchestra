import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { updateProject } from '@/features/projects/api/projects.api';
import type { ProjectDetail } from '@/features/projects/types/project.types';

export function updateProjectOptions(
  authFetch: AuthFetch,
  projectId: string,
  body: Record<string, unknown>,
): Promise<ProjectDetail> {
  return updateProject(authFetch, projectId, body);
}
