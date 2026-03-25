import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { SyncDocumentsResult } from '../types/project-options.types';

const BASE = '/api/projects';

export async function triggerDocumentsSync(
  authFetch: AuthFetch,
  projectId: string,
): Promise<SyncDocumentsResult> {
  const res = await authFetch(`${BASE}/${projectId}/microsoft-link/sync-documents`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SyncDocumentsResult>;
}
