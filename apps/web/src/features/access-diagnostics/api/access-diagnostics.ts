import { getBudgets } from '@/features/budgets/api/get-budgets';
import { listContracts } from '@/features/contracts/api/contracts.api';
import { listSuppliers } from '@/features/procurement/api/procurement.api';
import { listProjects } from '@/features/projects/api/projects.api';
import { listStrategicObjectives } from '@/features/strategic-vision/api/strategic-vision.api';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type EffectiveRightsOperation = 'read' | 'write' | 'admin';
export type EffectiveRightsResourceType =
  | 'PROJECT'
  | 'BUDGET'
  | 'CONTRACT'
  | 'SUPPLIER'
  | 'STRATEGIC_OBJECTIVE';

export type EffectiveRightsEvaluationMode =
  | 'enforced'
  | 'informational'
  | 'superseded_by_decision_engine';

export type EffectiveRightsCheck = {
  status: 'pass' | 'fail' | 'not_applicable';
  reasonCode: string | null;
  message: string;
  details?: Record<string, unknown>;
  evaluationMode?: EffectiveRightsEvaluationMode;
};

export type EnrichedDiagnosticCheck = {
  status: 'pass' | 'fail' | 'not_applicable';
  reasonCode: string | null;
  message: string;
  enforcedForIntent: boolean;
  details?: Record<string, unknown>;
};

export type EffectiveRightsResponse = {
  licenseCheck: EffectiveRightsCheck;
  subscriptionCheck: EffectiveRightsCheck;
  moduleActivationCheck: EffectiveRightsCheck;
  moduleVisibilityCheck: EffectiveRightsCheck;
  rbacCheck: EffectiveRightsCheck;
  aclCheck: EffectiveRightsCheck;
  finalDecision: 'allowed' | 'denied';
  denialReasons: Array<{ layer: string; reasonCode: string; message: string }>;
  computedAt: string;
  organizationScopeCheck?: EnrichedDiagnosticCheck;
  resourceOwnershipCheck?: EnrichedDiagnosticCheck;
  resourceAccessPolicyCheck?: EnrichedDiagnosticCheck;
};

export type EffectiveRightsQuery = {
  userId: string;
  resourceType: EffectiveRightsResourceType;
  resourceId: string;
  operation: EffectiveRightsOperation;
};

export type ResourceOption = {
  id: string;
  label: string;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la requête');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function buildQuery(query: EffectiveRightsQuery): string {
  return new URLSearchParams({
    userId: query.userId,
    resourceType: query.resourceType,
    resourceId: query.resourceId,
    operation: query.operation,
  }).toString();
}

export async function getClientEffectiveRights(
  authFetch: AuthFetch,
  query: EffectiveRightsQuery,
): Promise<EffectiveRightsResponse> {
  const res = await authFetch(
    `/api/access-diagnostics/effective-rights?${buildQuery(query)}`,
  );
  return handleResponse<EffectiveRightsResponse>(res);
}

export async function getPlatformEffectiveRights(
  authFetch: AuthFetch,
  clientId: string,
  query: EffectiveRightsQuery,
): Promise<EffectiveRightsResponse> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/access-diagnostics/effective-rights?${buildQuery(query)}`,
  );
  return handleResponse<EffectiveRightsResponse>(res);
}

export async function listResourceOptions(
  authFetch: AuthFetch,
  resourceType: EffectiveRightsResourceType,
  search: string,
): Promise<ResourceOption[]> {
  if (resourceType === 'PROJECT') {
    const rows = await listProjects(authFetch, { search, limit: 20 });
    return rows.items.map((row) => ({
      id: row.id,
      label: `${row.name}${row.code ? ` (${row.code})` : ''}`,
    }));
  }
  if (resourceType === 'BUDGET') {
    const rows = await getBudgets(authFetch, { search, page: 1, limit: 20 });
    return rows.items.map((row) => ({
      id: row.id,
      label: `${row.name}${row.code ? ` (${row.code})` : ''}`,
    }));
  }
  if (resourceType === 'CONTRACT') {
    const rows = await listContracts(authFetch, { search, offset: 0, limit: 20 });
    return rows.items.map((row) => ({
      id: row.id,
      label: `${row.title} (${row.reference})`,
    }));
  }
  if (resourceType === 'SUPPLIER') {
    const rows = await listSuppliers(authFetch, { search, offset: 0, limit: 20 });
    return rows.items.map((row) => ({
      id: row.id,
      label: row.code ? `${row.name} (${row.code})` : row.name,
    }));
  }
  const rows = await listStrategicObjectives(authFetch);
  const q = search.trim().toLowerCase();
  return rows
    .filter((row) => !q || row.title.toLowerCase().includes(q))
    .slice(0, 20)
    .map((row) => ({ id: row.id, label: row.title }));
}
