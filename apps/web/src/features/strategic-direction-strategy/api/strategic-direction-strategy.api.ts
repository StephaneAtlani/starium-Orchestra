import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ConsolidationDto,
  SchemaMetricsDto,
  StrategicDirectionPortfolioCardDto,
  StrategicDirectionStrategyCompareDto,
  StrategicDirectionStrategyDto,
  StrategicDirectionStrategyLinksDto,
  StrategicDirectionStrategyUserSummaryDto,
  StrategicDirectionStrategyVersionsDto,
  StrategicDirectionStrategyWorkflowSettingsResponse,
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
  ownAxes?: Array<Record<string, unknown>>;
  horizonStartYear?: number;
  horizonYearCount?: number;
  budgetsByYear?: Record<string, number>;
  axisContributions?: Record<string, number>;
  contentBlocks?: Array<Record<string, unknown>>;
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
  ownAxes?: Array<Record<string, unknown>>;
  horizonStartYear?: number;
  horizonYearCount?: number;
  budgetsByYear?: Record<string, number>;
  axisContributions?: Record<string, number>;
  contentBlocks?: Array<Record<string, unknown>>;
  horizonLabel?: string;
  ownerLabel?: string;
};

export type ReviewStrategicDirectionStrategyInput = {
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  decisionNote?: string;
  reviewInstanceLabel?: string;
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
  body: { alignedVisionId: string; validatorUserId?: string },
): Promise<StrategicDirectionStrategyDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

export async function getStrategicDirectionStrategyVersions(
  authFetch: AuthFetch,
  strategyId: string,
): Promise<StrategicDirectionStrategyVersionsDto> {
  const res = await authFetch(`/api/strategic-direction-strategies/${strategyId}/versions`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyVersionsDto>;
}

export async function compareStrategicDirectionStrategyVersions(
  authFetch: AuthFetch,
  baseStrategyId: string,
  targetStrategyId: string,
): Promise<StrategicDirectionStrategyCompareDto> {
  const res = await authFetch(
    `/api/strategic-direction-strategies/${baseStrategyId}/compare/${targetStrategyId}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyCompareDto>;
}

export async function fetchStrategicDirectionStrategyValidatorOptions(
  authFetch: AuthFetch,
): Promise<StrategicDirectionStrategyUserSummaryDto[]> {
  const res = await authFetch('/api/strategic-direction-strategies/validator-options');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyUserSummaryDto[]>;
}

export async function fetchStrategicDirectionStrategyWorkflowSettings(
  authFetch: AuthFetch,
): Promise<StrategicDirectionStrategyWorkflowSettingsResponse> {
  const res = await authFetch('/api/clients/active/strategic-direction-strategy-workflow-settings');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyWorkflowSettingsResponse>;
}

export async function patchStrategicDirectionStrategyWorkflowSettings(
  authFetch: AuthFetch,
  body: Record<string, unknown>,
): Promise<StrategicDirectionStrategyWorkflowSettingsResponse> {
  const res = await authFetch('/api/clients/active/strategic-direction-strategy-workflow-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategicDirectionStrategyWorkflowSettingsResponse>;
}

export async function getStrategicDirectionStrategyPortfolio(
  authFetch: AuthFetch,
  filters?: { alignedVisionId?: string; search?: string },
): Promise<StrategicDirectionPortfolioCardDto[]> {
  const params = new URLSearchParams();
  if (filters?.alignedVisionId) params.set('alignedVisionId', filters.alignedVisionId);
  if (filters?.search) params.set('search', filters.search);
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const res = await authFetch(`/api/strategic-direction-strategies/portfolio${query}`);
  if (!res.ok) throw await parseApiFormError(res);
  const body = (await res.json()) as
    | StrategicDirectionPortfolioCardDto[]
    | { items: StrategicDirectionPortfolioCardDto[] };
  return Array.isArray(body) ? body : (body.items ?? []);
}

export async function getStrategicDirectionStrategySchemaMetrics(
  authFetch: AuthFetch,
  strategyId: string,
): Promise<SchemaMetricsDto> {
  const res = await authFetch(
    `/api/strategic-direction-strategies/${strategyId}/schema-metrics`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SchemaMetricsDto>;
}

export async function getStrategicDirectionStrategyConsolidation(
  authFetch: AuthFetch,
  filters?: { alignedVisionId?: string },
): Promise<ConsolidationDto> {
  const params = new URLSearchParams();
  if (filters?.alignedVisionId) params.set('alignedVisionId', filters.alignedVisionId);
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const res = await authFetch(`/api/strategic-direction-strategies/consolidation${query}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ConsolidationDto>;
}

export type StrategyDocumentDto = {
  id: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function listStrategicDirectionStrategyDocuments(
  authFetch: AuthFetch,
  strategyId: string,
): Promise<StrategyDocumentDto[]> {
  const res = await authFetch(
    `/api/strategic-direction-strategies/${strategyId}/documents`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategyDocumentDto[]>;
}

export async function uploadStrategicDirectionStrategyDocument(
  authFetch: AuthFetch,
  strategyId: string,
  file: File,
): Promise<StrategyDocumentDto> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(
    `/api/strategic-direction-strategies/${strategyId}/documents/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<StrategyDocumentDto>;
}

export async function downloadStrategicDirectionStrategyDocument(
  authFetch: AuthFetch,
  strategyId: string,
  documentId: string,
): Promise<Blob> {
  const res = await authFetch(
    `/api/strategic-direction-strategies/${strategyId}/documents/${documentId}/download`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.blob();
}
