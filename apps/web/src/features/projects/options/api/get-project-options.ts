import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { getProject } from '@/features/projects/api/projects.api';
import type { ProjectDetail } from '@/features/projects/types/project.types';

/** Détail projet pour l’onglet Général des options (même source que la fiche). */
export function getProjectOptions(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectDetail> {
  return getProject(authFetch, projectId);
}
