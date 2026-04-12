import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  Contract,
  ContractAttachment,
  ContractListResult,
  ContractAttachmentCategory,
} from '../types/contract.types';

const BASE = '/api/contracts';

function buildQueryString(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const q = search.toString();
  return q ? `?${q}` : '';
}

function filenameFromContentDisposition(cd: string | null): string | undefined {
  if (!cd) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].replace(/"/g, '').trim());
    } catch {
      return utf8[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(cd);
  if (plain?.[1]) return plain[1].replace(/"/g, '');
  return undefined;
}

export async function listContracts(
  authFetch: AuthFetch,
  params?: {
    limit?: number;
    offset?: number;
    supplierId?: string;
    status?: string;
    expiresBefore?: string;
    search?: string;
  },
): Promise<ContractListResult> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ContractListResult>;
}

export async function getContract(authFetch: AuthFetch, id: string): Promise<Contract> {
  const res = await authFetch(`${BASE}/${id}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Contract>;
}

export interface CreateContractPayload {
  supplierId: string;
  reference: string;
  title: string;
  kind: string;
  status?: string;
  signedAt?: string;
  effectiveStart: string;
  effectiveEnd?: string | null;
  terminatedAt?: string | null;
  renewalMode?: string;
  noticePeriodDays?: number | null;
  renewalTermMonths?: number | null;
  currency: string;
  annualValue?: string;
  totalCommittedValue?: string;
  billingFrequency?: string | null;
  description?: string | null;
  internalNotes?: string | null;
}

export async function createContract(
  authFetch: AuthFetch,
  payload: CreateContractPayload,
): Promise<Contract> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Contract>;
}

export type UpdateContractPayload = Partial<CreateContractPayload>;

export async function updateContract(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateContractPayload,
): Promise<Contract> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Contract>;
}

export async function terminateContract(authFetch: AuthFetch, id: string): Promise<Contract> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Contract>;
}

export async function listContractAttachments(
  authFetch: AuthFetch,
  contractId: string,
): Promise<ContractAttachment[]> {
  const res = await authFetch(`${BASE}/${contractId}/attachments`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ContractAttachment[]>;
}

export async function uploadContractAttachment(
  authFetch: AuthFetch,
  contractId: string,
  file: File,
  fields: { name?: string; category?: ContractAttachmentCategory },
): Promise<ContractAttachment> {
  const body = new FormData();
  body.append('file', file);
  if (fields.name?.trim()) body.append('name', fields.name.trim());
  if (fields.category) body.append('category', fields.category);
  const res = await authFetch(`${BASE}/${contractId}/attachments`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ContractAttachment>;
}

export async function downloadContractAttachment(
  authFetch: AuthFetch,
  contractId: string,
  attachmentId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch(
    `${BASE}/${contractId}/attachments/${attachmentId}/download`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  const blob = await res.blob();
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? 'document';
  return { blob, filename };
}

export async function archiveContractAttachment(
  authFetch: AuthFetch,
  contractId: string,
  attachmentId: string,
): Promise<ContractAttachment> {
  const res = await authFetch(
    `${BASE}/${contractId}/attachments/${attachmentId}/archive`,
    { method: 'PATCH' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ContractAttachment>;
}
