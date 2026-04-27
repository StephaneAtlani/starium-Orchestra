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

export type CreateStrategicVisionInput = {
  title: string;
  statement: string;
  horizonLabel: string;
  isActive?: boolean;
};

export async function createStrategicVision(
  authFetch: AuthFetch,
  body: CreateStrategicVisionInput,
): Promise<StrategicVisionDto> {
  const res = await authFetch('/api/strategic-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicVisionDto>;
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

export type UpdateStrategicVisionInput = {
  title?: string;
  statement?: string;
  horizonLabel?: string;
  isActive?: boolean;
};

export async function updateStrategicVision(
  authFetch: AuthFetch,
  visionId: string,
  body: UpdateStrategicVisionInput,
): Promise<StrategicVisionDto> {
  const res = await authFetch(`/api/strategic-vision/${visionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicVisionDto>;
}

export type UpdateStrategicAxisInput = {
  name?: string;
  description?: string | null;
  orderIndex?: number | null;
};

export type CreateStrategicAxisInput = {
  visionId: string;
  name: string;
  description?: string;
  orderIndex?: number;
};

export async function createStrategicAxis(
  authFetch: AuthFetch,
  body: CreateStrategicAxisInput,
): Promise<StrategicAxisDto> {
  const res = await authFetch('/api/strategic-axes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicAxisDto>;
}

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

export type CreateStrategicObjectiveInput = {
  axisId: string;
  title: string;
  description?: string;
  ownerLabel?: string;
  status?: StrategicObjectiveDto['status'];
  deadline?: string;
};

export async function createStrategicObjective(
  authFetch: AuthFetch,
  body: CreateStrategicObjectiveInput,
): Promise<StrategicObjectiveDto> {
  const res = await authFetch('/api/strategic-objectives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicObjectiveDto>;
}

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

export type CreateStrategicObjectiveLinkInput = {
  linkType: 'PROJECT' | 'BUDGET' | 'RISK';
  targetId: string;
  targetLabelSnapshot: string;
};

export async function addStrategicObjectiveLink(
  authFetch: AuthFetch,
  objectiveId: string,
  body: CreateStrategicObjectiveLinkInput,
) {
  const res = await authFetch(`/api/strategic-objectives/${objectiveId}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<unknown>;
}

export async function removeStrategicObjectiveLink(
  authFetch: AuthFetch,
  objectiveId: string,
  linkId: string,
) {
  const res = await authFetch(`/api/strategic-objectives/${objectiveId}/links/${linkId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}
