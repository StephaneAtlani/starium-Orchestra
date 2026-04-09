import type { BudgetVersionSummaryDto } from '../types/budget-version-history.types';
import type {
  ActivateVersionResponseDto,
  CloseCycleRequestDto,
  CloseCycleResponseDto,
  CreateBaselineResponseDto,
  CreateCycleRevisionResponseDto,
  CreateRevisionResponseDto,
  CycleRevisionPhase,
  VersionSetDetailDto,
  VersionSetListItemDto,
} from '../types/budget-versioning-ui.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

async function parseApiError(
  res: Response,
  fallback: string,
): Promise<never> {
  const text = await res.text();
  let msg = fallback;
  try {
    const j = JSON.parse(text) as { message?: string | string[] };
    if (typeof j.message === 'string') msg = j.message;
    else if (Array.isArray(j.message)) msg = j.message.join(' ');
  } catch {
    /* ignore */
  }
  throw new Error(msg);
}

export async function getVersionHistory(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetVersionSummaryDto[]> {
  const res = await authFetch(`/api/budgets/${budgetId}/version-history`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Budget introuvable');
    await parseApiError(res, 'Erreur lors du chargement des versions');
  }
  return res.json() as Promise<BudgetVersionSummaryDto[]>;
}

export async function getVersionSetById(
  authFetch: AuthFetch,
  versionSetId: string,
): Promise<VersionSetDetailDto> {
  const res = await authFetch(`/api/budget-version-sets/${versionSetId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Ensemble de versions introuvable');
    await parseApiError(res, 'Erreur lors du chargement de l’ensemble de versions');
  }
  return res.json() as Promise<VersionSetDetailDto>;
}

export interface ListVersionSetsParams {
  exerciseId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listVersionSets(
  authFetch: AuthFetch,
  params?: ListVersionSetsParams,
): Promise<{
  items: VersionSetListItemDto[];
  total: number;
  limit: number;
  offset: number;
}> {
  const sp = new URLSearchParams();
  if (params?.exerciseId) sp.set('exerciseId', params.exerciseId);
  if (params?.search) sp.set('search', params.search);
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  const q = sp.toString();
  const res = await authFetch(
    `/api/budget-version-sets${q ? `?${q}` : ''}`,
  );
  if (!res.ok) {
    await parseApiError(res, 'Erreur lors du chargement des ensembles de versions');
  }
  return res.json();
}

export async function createBaseline(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<CreateBaselineResponseDto> {
  const res = await authFetch(`/api/budgets/${budgetId}/create-baseline`, {
    method: 'POST',
  });
  if (!res.ok) {
    await parseApiError(res, 'Impossible de créer la baseline');
  }
  return res.json() as Promise<CreateBaselineResponseDto>;
}

export interface CreateRevisionInput {
  label?: string;
  description?: string;
}

export async function createRevision(
  authFetch: AuthFetch,
  budgetId: string,
  body?: CreateRevisionInput,
): Promise<CreateRevisionResponseDto> {
  const res = await authFetch(`/api/budgets/${budgetId}/create-revision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    await parseApiError(res, 'Impossible de créer la révision');
  }
  return res.json() as Promise<CreateRevisionResponseDto>;
}

export async function activateVersion(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<ActivateVersionResponseDto> {
  const res = await authFetch(`/api/budgets/${budgetId}/activate-version`, {
    method: 'POST',
  });
  if (!res.ok) {
    await parseApiError(res, 'Impossible d’activer cette version');
  }
  return res.json() as Promise<ActivateVersionResponseDto>;
}

export async function archiveVersion(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<void> {
  const res = await authFetch(`/api/budgets/${budgetId}/archive-version`, {
    method: 'POST',
  });
  if (!res.ok) {
    await parseApiError(res, 'Impossible d’archiver cette version');
  }
}

export async function createCycleRevision(
  authFetch: AuthFetch,
  budgetId: string,
  phase: CycleRevisionPhase,
): Promise<CreateCycleRevisionResponseDto> {
  const res = await authFetch(
    `/api/budgets/${budgetId}/versioning/cycle-revision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    },
  );
  if (!res.ok) {
    await parseApiError(res, 'Impossible de créer la révision de cycle');
  }
  return res.json() as Promise<CreateCycleRevisionResponseDto>;
}

export async function closeBudgetCycle(
  authFetch: AuthFetch,
  budgetId: string,
  body?: CloseCycleRequestDto,
): Promise<CloseCycleResponseDto> {
  const res = await authFetch(`/api/budgets/${budgetId}/versioning/close-cycle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    await parseApiError(res, 'Impossible de clôturer le cycle budgétaire');
  }
  return res.json() as Promise<CloseCycleResponseDto>;
}
