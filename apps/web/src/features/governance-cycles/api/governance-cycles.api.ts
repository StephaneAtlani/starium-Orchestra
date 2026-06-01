import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  GovernanceCycleGlobalSummaryDto,
  GovernanceCycleItemListResponseDto,
  GovernanceCycleItemResponseDto,
  GovernanceCycleListResponseDto,
  GovernanceCycleResponseDto,
  GovernanceCyclesByProjectResponseDto,
  ListGovernanceCycleItemsParams,
  ListGovernanceCyclesParams,
} from '../types/governance-cycle.types';
import type {
  CreateGovernanceCycleFormValues,
  PatchGovernanceCycleItemArbitrationFormValues,
  PatchGovernanceCycleItemEditionFormValues,
  UpdateGovernanceCycleFormValues,
} from '../schemas/governance-cycle.schemas';

const BASE = '/api/governance-cycles';

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function normalizeCyclePayload(
  body: CreateGovernanceCycleFormValues | UpdateGovernanceCycleFormValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.name = body.name.trim();
  if (body.code !== undefined) payload.code = body.code.trim() || null;
  if (body.description !== undefined) payload.description = body.description.trim() || null;
  if (body.cadence !== undefined) payload.cadence = body.cadence;
  if (body.status !== undefined) payload.status = body.status;
  if (body.startDate !== undefined) payload.startDate = body.startDate.trim() || null;
  if (body.endDate !== undefined) payload.endDate = body.endDate.trim() || null;
  if (body.sponsorLabel !== undefined) payload.sponsorLabel = body.sponsorLabel.trim() || null;
  if (body.objectiveSummary !== undefined) {
    payload.objectiveSummary = body.objectiveSummary.trim() || null;
  }
  if (body.decisionSummary !== undefined) {
    payload.decisionSummary = body.decisionSummary.trim() || null;
  }
  const cfg = (body as { governanceConfig?: Record<string, unknown> }).governanceConfig;
  if (cfg !== undefined) payload.governanceConfig = cfg;
  return payload;
}

export async function listGovernanceCycles(
  authFetch: AuthFetch,
  params?: ListGovernanceCyclesParams,
): Promise<GovernanceCycleListResponseDto> {
  const qs = buildQueryString(params as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleListResponseDto>;
}

export async function getGovernanceCycle(
  authFetch: AuthFetch,
  cycleId: string,
): Promise<GovernanceCycleResponseDto> {
  const res = await authFetch(`${BASE}/${cycleId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleResponseDto>;
}

export async function getGovernanceCycleSummary(
  authFetch: AuthFetch,
  cycleId: string,
): Promise<GovernanceCycleGlobalSummaryDto> {
  const res = await authFetch(`${BASE}/${cycleId}/summary`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleGlobalSummaryDto>;
}

export async function getGovernanceCyclesByProject(
  authFetch: AuthFetch,
  projectId: string,
): Promise<GovernanceCyclesByProjectResponseDto> {
  const res = await authFetch(`${BASE}/by-project/${projectId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCyclesByProjectResponseDto>;
}

export async function createGovernanceCycle(
  authFetch: AuthFetch,
  body: CreateGovernanceCycleFormValues,
): Promise<GovernanceCycleResponseDto> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizeCyclePayload(body)),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleResponseDto>;
}

export async function updateGovernanceCycle(
  authFetch: AuthFetch,
  cycleId: string,
  body: UpdateGovernanceCycleFormValues,
): Promise<GovernanceCycleResponseDto> {
  const res = await authFetch(`${BASE}/${cycleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizeCyclePayload(body)),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleResponseDto>;
}

export async function archiveGovernanceCycle(
  authFetch: AuthFetch,
  cycleId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${cycleId}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function restoreGovernanceCycle(
  authFetch: AuthFetch,
  cycleId: string,
): Promise<GovernanceCycleResponseDto> {
  const res = await authFetch(`${BASE}/${cycleId}/restore`, { method: 'PATCH' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleResponseDto>;
}

export async function listGovernanceCycleItems(
  authFetch: AuthFetch,
  cycleId: string,
  params?: ListGovernanceCycleItemsParams,
): Promise<GovernanceCycleItemListResponseDto> {
  const qs = buildQueryString(params as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE}/${cycleId}/items${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleItemListResponseDto>;
}

export async function createGovernanceCycleItem(
  authFetch: AuthFetch,
  cycleId: string,
  body: Record<string, unknown>,
): Promise<GovernanceCycleItemResponseDto> {
  const res = await authFetch(`${BASE}/${cycleId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleItemResponseDto>;
}

export async function patchGovernanceCycleItemEdition(
  authFetch: AuthFetch,
  cycleId: string,
  itemId: string,
  body: PatchGovernanceCycleItemEditionFormValues,
): Promise<GovernanceCycleItemResponseDto> {
  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title.trim() || null;
  if (body.description !== undefined) payload.description = body.description.trim() || null;
  if (body.estimatedBudgetAmount !== undefined) {
    payload.estimatedBudgetAmount =
      body.estimatedBudgetAmount === null || body.estimatedBudgetAmount === ''
        ? null
        : body.estimatedBudgetAmount.trim();
  }
  if (body.estimatedCapacityDays !== undefined) {
    payload.estimatedCapacityDays =
      body.estimatedCapacityDays === null || body.estimatedCapacityDays === ''
        ? null
        : body.estimatedCapacityDays.trim();
  }
  if (body.valueScore !== undefined) payload.valueScore = body.valueScore;
  if (body.riskScore !== undefined) payload.riskScore = body.riskScore;
  if (body.budgetScore !== undefined) payload.budgetScore = body.budgetScore;
  if (body.capacityScore !== undefined) payload.capacityScore = body.capacityScore;
  if (body.alignmentScore !== undefined) payload.alignmentScore = body.alignmentScore;

  const res = await authFetch(`${BASE}/${cycleId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleItemResponseDto>;
}

export async function patchGovernanceCycleItemArbitration(
  authFetch: AuthFetch,
  cycleId: string,
  itemId: string,
  body: PatchGovernanceCycleItemArbitrationFormValues,
): Promise<GovernanceCycleItemResponseDto> {
  const payload: Record<string, unknown> = {
    decisionStatus: body.decisionStatus,
  };
  if (body.decisionReason !== undefined) {
    payload.decisionReason =
      body.decisionReason === null || body.decisionReason === ''
        ? null
        : body.decisionReason.trim();
  }

  const res = await authFetch(`${BASE}/${cycleId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<GovernanceCycleItemResponseDto>;
}

export async function deleteGovernanceCycleItem(
  authFetch: AuthFetch,
  cycleId: string,
  itemId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${cycleId}/items/${itemId}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}

export type { ApiFormError } from '@/features/budgets/api/types';

export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}
