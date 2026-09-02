/**
 * API budget-imports — RFC-018 + RFC-BUD-043 (jobs, template, duplicate).
 */

import { parseApiFormError } from './budget-management.api';
import type { AuthFetch } from './budget-management.api';
import type {
  AnalyzeResult,
  BudgetImportJobDto,
  BudgetImportMappingDto,
  CreateBudgetImportMappingPayload,
  ExecuteResult,
  ListBudgetImportJobsParams,
  ListBudgetImportJobsResult,
  ListBudgetImportMappingsParams,
  ListBudgetImportMappingsResult,
  MappingConfig,
  BudgetImportOptionsConfig,
  PreviewResult,
  UpdateBudgetImportMappingPayload,
} from '../types/budget-imports.types';

export type { AuthFetch };

const BASE_IMPORTS = '/api/budget-imports';
const BASE_MAPPINGS = '/api/budget-import-mappings';
const BASE_JOBS = '/api/budget-import-jobs';

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await parseApiFormError(res);
  }
  return res.json() as Promise<T>;
}

export async function analyzeImport(authFetch: AuthFetch, file: File): Promise<AnalyzeResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authFetch(`${BASE_IMPORTS}/analyze`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<AnalyzeResult>(res);
}

/** Ré-analyse le fichier déjà stocké pour un autre onglet Excel (même `fileToken`). */
export async function analyzeImportSheet(
  authFetch: AuthFetch,
  body: { fileToken: string; sheetName: string },
): Promise<AnalyzeResult> {
  const res = await authFetch(`${BASE_IMPORTS}/analyze-sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<AnalyzeResult>(res);
}

export interface PreviewImportBody {
  budgetId: string;
  fileToken: string;
  /** Onglet Excel (si absent, le parseur utilise le premier onglet). */
  sheetName?: string;
  mapping: MappingConfig;
  options?: BudgetImportOptionsConfig;
}

export async function previewImport(
  authFetch: AuthFetch,
  body: PreviewImportBody,
): Promise<PreviewResult> {
  const res = await authFetch(`${BASE_IMPORTS}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<PreviewResult>(res);
}

export interface ExecuteImportBody {
  budgetId: string;
  fileToken: string;
  /** Onglet Excel (si absent, le parseur utilise le premier onglet). */
  sheetName?: string;
  mapping: MappingConfig;
  mappingId?: string;
  options?: BudgetImportOptionsConfig;
}

export async function executeImport(
  authFetch: AuthFetch,
  body: ExecuteImportBody,
): Promise<ExecuteResult> {
  const res = await authFetch(`${BASE_IMPORTS}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<ExecuteResult>(res);
}

export async function downloadBudgetImportTemplate(authFetch: AuthFetch): Promise<void> {
  const res = await authFetch(`${BASE_IMPORTS}/template.csv`);
  if (!res.ok) {
    throw await parseApiFormError(res);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orchestra-import-lignes-modele.csv';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function listBudgetImportJobs(
  authFetch: AuthFetch,
  params?: ListBudgetImportJobsParams,
): Promise<ListBudgetImportJobsResult> {
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  const res = await authFetch(`${BASE_JOBS}${qs}`);
  return handleResponse<ListBudgetImportJobsResult>(res);
}

export async function getBudgetImportJob(
  authFetch: AuthFetch,
  id: string,
): Promise<BudgetImportJobDto> {
  const res = await authFetch(`${BASE_JOBS}/${id}`);
  return handleResponse<BudgetImportJobDto>(res);
}

export async function listBudgetImportMappings(
  authFetch: AuthFetch,
  params?: ListBudgetImportMappingsParams,
): Promise<ListBudgetImportMappingsResult> {
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  const res = await authFetch(`${BASE_MAPPINGS}${qs}`);
  return handleResponse<ListBudgetImportMappingsResult>(res);
}

export async function getBudgetImportMapping(
  authFetch: AuthFetch,
  id: string,
): Promise<BudgetImportMappingDto> {
  const res = await authFetch(`${BASE_MAPPINGS}/${id}`);
  return handleResponse<BudgetImportMappingDto>(res);
}

export async function createBudgetImportMapping(
  authFetch: AuthFetch,
  payload: CreateBudgetImportMappingPayload,
): Promise<BudgetImportMappingDto> {
  const res = await authFetch(BASE_MAPPINGS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<BudgetImportMappingDto>(res);
}

export async function updateBudgetImportMapping(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateBudgetImportMappingPayload,
): Promise<BudgetImportMappingDto> {
  const res = await authFetch(`${BASE_MAPPINGS}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<BudgetImportMappingDto>(res);
}

export async function duplicateBudgetImportMapping(
  authFetch: AuthFetch,
  id: string,
): Promise<BudgetImportMappingDto> {
  const res = await authFetch(`${BASE_MAPPINGS}/${id}/duplicate`, {
    method: 'POST',
  });
  return handleResponse<BudgetImportMappingDto>(res);
}

export async function deleteBudgetImportMapping(authFetch: AuthFetch, id: string): Promise<void> {
  const res = await authFetch(`${BASE_MAPPINGS}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw await parseApiFormError(res);
  }
}
