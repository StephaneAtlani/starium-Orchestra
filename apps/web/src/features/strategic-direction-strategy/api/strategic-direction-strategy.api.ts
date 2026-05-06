import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  StrategicDirectionStrategyDto,
  StrategicDirectionStrategyLinksDto,
} from '../types/strategic-direction-strategy.types';

export type CreateStrategicDirectionStrategyInput = {
  directionId: string;
  alignedVisionId: string;
  title: string;
  ambition: string;
  context: string;
  statement?: string;
  strategicPriorities?: Array<Record<string, unknown>>;
  expectedOutcomes?: Array<Record<string, unknown>>;
  kpis?: Array<Record<string, unknown>>;
  majorInitiatives?: Array<Record<string, unknown>>;
  risks?: Array<Record<string, unknown>>;
  horizonLabel: string;
  ownerLabel?: string;
};

export type UpdateStrategicDirectionStrategyInput = {
  archiveReason?: string;
  alignedVisionId?: string;
  title?: string;
  ambition?: string;
  context?: string;
  statement?: string;
  strategicPriorities?: Array<Record<string, unknown>>;
  expectedOutcomes?: Array<Record<string, unknown>>;
  kpis?: Array<Record<string, unknown>>;
  majorInitiatives?: Array<Record<string, unknown>>;
  risks?: Array<Record<string, unknown>>;
  horizonLabel?: string;
  ownerLabel?: string;
};

export type ReviewStrategicDirectionStrategyInput = {
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
};

export async function listStrategicDirectionStrategies(
  authFetch: AuthFetch,
  filters?: {
    directionId?: string;
    alignedVisionId?: string;
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
    search?: string;
    includeArchived?: boolean;
  },
): Promise<StrategicDirectionStrategyDto[]> {
  const params = new URLSearchParams();
  if (filters?.directionId) params.set('directionId', filters.directionId);
  if (filters?.alignedVisionId) params.set('alignedVisionId', filters.alignedVisionId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.includeArchived === true) params.set('includeArchived', 'true');
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const res = await authFetch(`/api/strategic-direction-strategies${query}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto[]>;
}

export async function getStrategicDirectionStrategy(
  authFetch: AuthFetch,
  strategyId: string,
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto>;
}

export async function getStrategicDirectionStrategyLinks(
  authFetch: AuthFetch,
  strategyId: string,
): Promise<StrategicDirectionStrategyLinksDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/links`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyLinksDto>;
}

export async function putStrategicDirectionStrategyAxes(
  authFetch: AuthFetch,
  strategyId: string,
  strategicAxisIds: string[],
): Promise<StrategicDirectionStrategyLinksDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/axes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategicAxisIds }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyLinksDto>;
}

export async function putStrategicDirectionStrategyObjectives(
  authFetch: AuthFetch,
  strategyId: string,
  strategicObjectiveIds: string[],
): Promise<StrategicDirectionStrategyLinksDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/objectives`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategicObjectiveIds }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyLinksDto>;
}

export async function createStrategicDirectionStrategy(
  authFetch: AuthFetch,
  body: CreateStrategicDirectionStrategyInput,
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch('/api/strategic-direction-strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto>;
}

export async function updateStrategicDirectionStrategy(
  authFetch: AuthFetch,
  strategyId: string,
  body: UpdateStrategicDirectionStrategyInput,
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto>;
}

export async function submitStrategicDirectionStrategy(
  authFetch: AuthFetch,
  strategyId: string,
  alignedVisionId: string,
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alignedVisionId }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto>;
}

export async function reviewStrategicDirectionStrategy(
  authFetch: AuthFetch,
  strategyId: string,
  body: ReviewStrategicDirectionStrategyInput,
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto>;
}

export async function archiveStrategicDirectionStrategy(
  authFetch: AuthFetch,
  strategyId: string,
  reason: string,
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyDto>;
}
