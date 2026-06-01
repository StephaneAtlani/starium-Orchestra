import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  GovernanceCycleInstanceDetailDto,
  GovernanceCycleInstanceListResponseDto,
  GovernanceCycleInstanceResponseDto,
} from '../types/governance-cycle-instance.types';

const base = (cycleId: string) => `/api/governance-cycles/${cycleId}/instances`;

export async function listGovernanceCycleInstances(
  authFetch: AuthFetch,
  cycleId: string,
  includeArchived?: boolean,
): Promise<GovernanceCycleInstanceListResponseDto> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  const res = await authFetch(`${base(cycleId)}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceListResponseDto>;
}

export async function getGovernanceCycleInstance(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
): Promise<GovernanceCycleInstanceDetailDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceDetailDto>;
}

export async function createGovernanceCycleInstance(
  authFetch: AuthFetch,
  cycleId: string,
  body: Record<string, unknown>,
): Promise<GovernanceCycleInstanceResponseDto> {
  const res = await authFetch(base(cycleId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceResponseDto>;
}

export async function updateGovernanceCycleInstance(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
  body: Record<string, unknown>,
): Promise<GovernanceCycleInstanceResponseDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceResponseDto>;
}

export async function cancelGovernanceCycleInstance(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
): Promise<GovernanceCycleInstanceResponseDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}/cancel`, { method: 'POST' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceResponseDto>;
}

export async function openGovernanceCycleInstance(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
): Promise<GovernanceCycleInstanceResponseDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}/open`, { method: 'POST' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceResponseDto>;
}

export async function closeGovernanceCycleInstance(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
): Promise<GovernanceCycleInstanceDetailDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}/close`, { method: 'POST' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceDetailDto>;
}

export async function replaceGovernanceCycleInstanceAgenda(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
  itemIds: string[],
): Promise<GovernanceCycleInstanceDetailDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}/agenda`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: itemIds.map((itemId, index) => ({ itemId, sortOrder: index })),
    }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceDetailDto>;
}

export async function patchGovernanceCycleInstanceDecisions(
  authFetch: AuthFetch,
  cycleId: string,
  instanceId: string,
  decisions: Array<{
    itemId: string;
    decisionStatus: string;
    decisionReason?: string | null;
  }>,
): Promise<GovernanceCycleInstanceDetailDto> {
  const res = await authFetch(`${base(cycleId)}/${instanceId}/decisions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceDetailDto>;
}

export async function generateGovernanceCycleInstances(
  authFetch: AuthFetch,
  cycleId: string,
): Promise<GovernanceCycleInstanceListResponseDto> {
  const res = await authFetch(`${base(cycleId)}/generate`, { method: 'POST' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleInstanceListResponseDto>;
}

export async function submitProjectToGovernanceCycle(
  authFetch: AuthFetch,
  cycleId: string,
  projectId: string,
): Promise<unknown> {
  const res = await authFetch(`/api/governance-cycles/${cycleId}/candidacies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}
