import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  StrategicAxisDto,
  StrategicVisionAlertsResponseDto,
  StrategicObjectiveDto,
  StrategicVisionDto,
  StrategicVisionKpisResponseDto,
} from '../types/strategic-vision.types';

export async function listStrategicVisions(
  authFetch: AuthFetch,
): Promise<StrategicVisionDto[]> {
  const res = await authFetch('/api/strategic-vision');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicVisionDto[]>;
}

export async function listStrategicAxes(authFetch: AuthFetch): Promise<StrategicAxisDto[]> {
  const res = await authFetch('/api/strategic-axes');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicAxisDto[]>;
}

export async function listStrategicObjectives(
  authFetch: AuthFetch,
): Promise<StrategicObjectiveDto[]> {
  const res = await authFetch('/api/strategic-objectives');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicObjectiveDto[]>;
}

export async function getStrategicVisionKpis(
  authFetch: AuthFetch,
): Promise<StrategicVisionKpisResponseDto> {
  const res = await authFetch('/api/strategic-vision/kpis');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicVisionKpisResponseDto>;
}

export async function getStrategicVisionAlerts(
  authFetch: AuthFetch,
): Promise<StrategicVisionAlertsResponseDto> {
  const res = await authFetch('/api/strategic-vision/alerts');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicVisionAlertsResponseDto>;
}

export type UpdateStrategicAxisInput = {
  name?: string;
  description?: string | null;
  orderIndex?: number | null;
};

export async function updateStrategicAxis(
  authFetch: AuthFetch,
  axisId: string,
  body: UpdateStrategicAxisInput,
): Promise<StrategicAxisDto> {
  const res = await authFetch(`/api/strategic-axes/${axisId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicAxisDto>;
}

export type UpdateStrategicObjectiveInput = {
  title?: string;
  description?: string | null;
  ownerLabel?: string | null;
  status?: StrategicObjectiveDto['status'];
  deadline?: string | null;
};

export async function updateStrategicObjective(
  authFetch: AuthFetch,
  objectiveId: string,
  body: UpdateStrategicObjectiveInput,
): Promise<StrategicObjectiveDto> {
  const res = await authFetch(`/api/strategic-objectives/${objectiveId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicObjectiveDto>;
}
