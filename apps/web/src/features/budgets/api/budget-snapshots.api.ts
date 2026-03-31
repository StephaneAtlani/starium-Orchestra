import type {
  BudgetSnapshotDetailDto,
  BudgetSnapshotSummaryDto,
  CreateBudgetSnapshotInput,
  ListBudgetSnapshotsResult,
} from '../types/budget-snapshots-list.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function listBudgetSnapshots(
  authFetch: AuthFetch,
  budgetId: string,
  params?: { limit?: number; offset?: number },
): Promise<ListBudgetSnapshotsResult> {
  const search = new URLSearchParams();
  search.set('budgetId', budgetId);
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const res = await authFetch(`/api/budget-snapshots?${search.toString()}`);
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des snapshots');
  }
  return res.json();
}

export async function createBudgetSnapshot(
  authFetch: AuthFetch,
  payload: CreateBudgetSnapshotInput,
): Promise<BudgetSnapshotSummaryDto> {
  const res = await authFetch('/api/budget-snapshots', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Erreur lors de la création du snapshot';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse failure, keep fallback message
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getBudgetSnapshotById(
  authFetch: AuthFetch,
  snapshotId: string,
): Promise<BudgetSnapshotDetailDto> {
  const res = await authFetch(`/api/budget-snapshots/${snapshotId}`);
  if (!res.ok) {
    let message = 'Erreur lors du chargement du snapshot';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse failure, keep fallback message
    }
    throw new Error(message);
  }
  return res.json();
}
