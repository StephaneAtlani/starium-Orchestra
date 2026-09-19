import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import type {
  CreateProcedureInput,
  ProcedureDetail,
  ProcedureListResponse,
} from '../types/procedure.types';

const BASE = '/api/procedures';

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    throw new Error(msg || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listProcedures(
  authFetch: AuthFetch,
  params?: {
    limit?: number;
    offset?: number;
    q?: string;
    status?: string;
    categoryId?: string;
    includeArchived?: boolean;
  },
): Promise<ProcedureListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  if (params?.q) sp.set('q', params.q);
  if (params?.status) sp.set('status', params.status);
  if (params?.categoryId) sp.set('categoryId', params.categoryId);
  if (params?.includeArchived) sp.set('includeArchived', 'true');
  const qs = sp.toString();
  return authFetch(`${BASE}${qs ? `?${qs}` : ''}`).then((r: Response) =>
    parseJson<ProcedureListResponse>(r),
  );
}

export function getProcedure(
  authFetch: AuthFetch,
  id: string,
): Promise<ProcedureDetail> {
  return authFetch(`${BASE}/${id}`).then((r: Response) =>
    parseJson<ProcedureDetail>(r),
  );
}

export function createProcedure(
  authFetch: AuthFetch,
  input: CreateProcedureInput,
): Promise<ProcedureDetail> {
  return authFetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r: Response) => parseJson<ProcedureDetail>(r));
}

export function archiveProcedure(
  authFetch: AuthFetch,
  id: string,
): Promise<ProcedureDetail> {
  return authFetch(`${BASE}/${id}/archive`, { method: 'POST' }).then(
    (r: Response) => parseJson<ProcedureDetail>(r),
  );
}

export function unarchiveProcedure(
  authFetch: AuthFetch,
  id: string,
): Promise<ProcedureDetail> {
  return authFetch(`${BASE}/${id}/unarchive`, { method: 'POST' }).then(
    (r: Response) => parseJson<ProcedureDetail>(r),
  );
}

export function updateProcedureDraft(
  authFetch: AuthFetch,
  id: string,
  input: {
    contentJson?: Record<string, unknown>;
    title?: string;
    categoryId?: string;
    expectedUpdatedAt?: string;
  },
): Promise<ProcedureDetail> {
  return authFetch(`${BASE}/${id}/draft`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r: Response) => parseJson<ProcedureDetail>(r));
}

export function transitionProcedure(
  authFetch: AuthFetch,
  id: string,
  input: {
    to: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
    bumpType?: 'MINOR' | 'MAJOR';
    changeSummary?: string;
    expectedUpdatedAt?: string;
  },
): Promise<ProcedureDetail> {
  return authFetch(`${BASE}/${id}/transition`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r: Response) => parseJson<ProcedureDetail>(r));
}

export function listProcedureVersions(
  authFetch: AuthFetch,
  id: string,
): Promise<{ items: import('../types/procedure.types').ProcedureVersionListItem[] }> {
  return authFetch(`${BASE}/${id}/versions`).then((r: Response) =>
    parseJson(r),
  );
}

export function restoreProcedureVersionToDraft(
  authFetch: AuthFetch,
  procedureId: string,
  versionId: string,
): Promise<ProcedureDetail> {
  return authFetch(
    `${BASE}/${procedureId}/versions/${versionId}/restore-to-draft`,
    { method: 'POST' },
  ).then((r: Response) => parseJson<ProcedureDetail>(r));
}

export type ProcedureAssetDto = {
  id: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export function listProcedureAssets(
  authFetch: AuthFetch,
  procedureId: string,
): Promise<ProcedureAssetDto[]> {
  return authFetch(`${BASE}/${procedureId}/assets`).then((r: Response) =>
    parseJson<ProcedureAssetDto[]>(r),
  );
}

export function uploadProcedureAsset(
  authFetch: AuthFetch,
  procedureId: string,
  file: File,
): Promise<ProcedureAssetDto> {
  const body = new FormData();
  body.append('file', file);
  return authFetch(`${BASE}/${procedureId}/assets/upload`, {
    method: 'POST',
    body,
  }).then((r: Response) => parseJson<ProcedureAssetDto>(r));
}

export async function downloadProcedureAssetBlob(
  authFetch: AuthFetch,
  procedureId: string,
  assetId: string,
): Promise<Blob> {
  const res = await authFetch(`${BASE}/${procedureId}/assets/${assetId}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    throw new Error(msg || `Erreur ${res.status}`);
  }
  return res.blob();
}

export function deleteProcedureAsset(
  authFetch: AuthFetch,
  procedureId: string,
  assetId: string,
): Promise<{ ok: true }> {
  return authFetch(`${BASE}/${procedureId}/assets/${assetId}`, {
    method: 'DELETE',
  }).then((r: Response) => parseJson<{ ok: true }>(r));
}

export type ProcedureSettingsDto = {
  usePilotageCycle: boolean;
  validators: { userId: string; label: string }[];
  updatedAt: string;
};

export function getProcedureSettings(
  authFetch: AuthFetch,
): Promise<ProcedureSettingsDto> {
  return authFetch(`${BASE}/settings`).then((r: Response) =>
    parseJson<ProcedureSettingsDto>(r),
  );
}

export function updateProcedureSettings(
  authFetch: AuthFetch,
  input: {
    usePilotageCycle?: boolean;
    validatorUserIds?: string[];
  },
): Promise<ProcedureSettingsDto> {
  return authFetch(`${BASE}/settings`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r: Response) => parseJson<ProcedureSettingsDto>(r));
}

export type ProcedureCategoryDto = {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

export function listProcedureCategories(
  authFetch: AuthFetch,
  opts?: { activeOnly?: boolean },
): Promise<ProcedureCategoryDto[]> {
  const sp = new URLSearchParams();
  if (opts?.activeOnly) sp.set('activeOnly', 'true');
  const qs = sp.toString();
  return authFetch(`${BASE}/categories${qs ? `?${qs}` : ''}`).then(
    (r: Response) => parseJson<ProcedureCategoryDto[]>(r),
  );
}

export function createProcedureCategory(
  authFetch: AuthFetch,
  input: { label: string; code?: string },
): Promise<ProcedureCategoryDto> {
  return authFetch(`${BASE}/categories`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r: Response) => parseJson<ProcedureCategoryDto>(r));
}

export function updateProcedureCategory(
  authFetch: AuthFetch,
  categoryId: string,
  input: { label?: string; sortOrder?: number; isActive?: boolean },
): Promise<ProcedureCategoryDto> {
  return authFetch(`${BASE}/categories/${categoryId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r: Response) => parseJson<ProcedureCategoryDto>(r));
}
