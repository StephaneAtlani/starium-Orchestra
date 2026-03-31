/**
 * API budget-imports — RFC-018 (analyze, preview, execute, mappings CRUD).
 */

import { parseApiFormError } from './budget-management.api';
import type { AuthFetch } from './budget-management.api';
import type {
  AnalyzeResult,
  BudgetImportMappingDto,
  CreateBudgetImportMappingPayload,
  ExecuteResult,
  ListBudgetImportMappingsResult,
  MappingConfig,
  BudgetImportOptionsConfig,
  PreviewResult,
  UpdateBudgetImportMappingPayload,
} from '../types/budget-imports.types';

export type { AuthFetch };

const BASE_IMPORTS = '/api/budget-imports';
const BASE_MAPPINGS = '/api/budget-import-mappings';

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

export async function listBudgetImportMappings(
  authFetch: AuthFetch,
  params?: { limit?: number; offset?: number },
): Promise<ListBudgetImportMappingsResult> {
  const qs = buildQueryString(params);
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

export async function deleteBudgetImportMapping(authFetch: AuthFetch, id: string): Promise<void> {
  const res = await authFetch(`${BASE_MAPPINGS}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw await parseApiFormError(res);
  }
}
