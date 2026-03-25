import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { SyncTasksResult } from '../types/project-options.types';

const BASE = '/api/projects';

export async function triggerTasksSync(
  authFetch: AuthFetch,
  projectId: string,
): Promise<SyncTasksResult> {
  const res = await authFetch(`${BASE}/${projectId}/microsoft-link/sync-tasks`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SyncTasksResult>;
}
