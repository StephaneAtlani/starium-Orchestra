import type { AuthFetch } from './budget-snapshots.api';
import type {
  BudgetSnapshotOccasionTypeDto,
  CreateBudgetSnapshotOccasionTypeInput,
  UpdateBudgetSnapshotOccasionTypeInput,
} from '../types/budget-snapshot-occasion-types.types';

export async function listBudgetSnapshotOccasionTypesMerged(
  authFetch: AuthFetch,
): Promise<BudgetSnapshotOccasionTypeDto[]> {
  const res = await authFetch('/api/budget-snapshot-occasion-types');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des types d’occasion');
  }
  return res.json();
}

export async function createClientBudgetSnapshotOccasionType(
  authFetch: AuthFetch,
  body: CreateBudgetSnapshotOccasionTypeInput,
): Promise<BudgetSnapshotOccasionTypeDto> {
  const res = await authFetch('/api/budget-snapshot-occasion-types', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    throw new Error(msg);
  }
  return res.json();
}

export async function updateClientBudgetSnapshotOccasionType(
  authFetch: AuthFetch,
  id: string,
  body: UpdateBudgetSnapshotOccasionTypeInput,
): Promise<BudgetSnapshotOccasionTypeDto> {
  const res = await authFetch(`/api/budget-snapshot-occasion-types/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteClientBudgetSnapshotOccasionType(
  authFetch: AuthFetch,
  id: string,
): Promise<BudgetSnapshotOccasionTypeDto> {
  const res = await authFetch(`/api/budget-snapshot-occasion-types/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const msg = await parseError(res);
    throw new Error(msg);
  }
  return res.json();
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
  } catch {
    // ignore
  }
  return 'Erreur API';
}
