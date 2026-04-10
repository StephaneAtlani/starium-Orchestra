import type { AuthFetch } from './budget-snapshots.api';
import type {
  BudgetSnapshotOccasionTypeDto,
  CreateBudgetSnapshotOccasionTypeInput,
  UpdateBudgetSnapshotOccasionTypeInput,
} from '../types/budget-snapshot-occasion-types.types';

export async function listPlatformBudgetSnapshotOccasionTypes(
  authFetch: AuthFetch,
): Promise<BudgetSnapshotOccasionTypeDto[]> {
  const res = await authFetch('/api/platform/budget-snapshot-occasion-types');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des types globaux');
  }
  return res.json();
}

export async function createPlatformBudgetSnapshotOccasionType(
  authFetch: AuthFetch,
  body: CreateBudgetSnapshotOccasionTypeInput,
): Promise<BudgetSnapshotOccasionTypeDto> {
  const res = await authFetch('/api/platform/budget-snapshot-occasion-types', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await textOrJsonError(res));
  }
  return res.json();
}

export async function updatePlatformBudgetSnapshotOccasionType(
  authFetch: AuthFetch,
  id: string,
  body: UpdateBudgetSnapshotOccasionTypeInput,
): Promise<BudgetSnapshotOccasionTypeDto> {
  const res = await authFetch(`/api/platform/budget-snapshot-occasion-types/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await textOrJsonError(res));
  }
  return res.json();
}

export async function deletePlatformBudgetSnapshotOccasionType(
  authFetch: AuthFetch,
  id: string,
): Promise<BudgetSnapshotOccasionTypeDto> {
  const res = await authFetch(`/api/platform/budget-snapshot-occasion-types/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await textOrJsonError(res));
  }
  return res.json();
}

async function textOrJsonError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
  } catch {
    // ignore
  }
  return `Erreur ${res.status}`;
}
