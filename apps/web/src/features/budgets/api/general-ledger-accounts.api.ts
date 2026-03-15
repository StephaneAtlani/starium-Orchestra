/**
 * API general-ledger-accounts — liste pour options du formulaire ligne (RFC-FE-015).
 */

import { parseApiFormError } from './budget-management.api';
import type { AuthFetch } from './budget-management.api';

export interface GeneralLedgerAccountOption {
  id: string;
  code: string;
  name: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface GeneralLedgerAccountsPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

const BASE = '/api/general-ledger-accounts';

function buildQueryString(params?: ListQuery): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  if (params.search?.trim()) search.set('search', params.search.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function listGeneralLedgerAccounts(
  authFetch: AuthFetch,
  query?: ListQuery,
): Promise<GeneralLedgerAccountsPaginatedResponse<GeneralLedgerAccountOption>> {
  const qs = buildQueryString(query ?? { limit: 200 });
  const res = await authFetch(`${BASE}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  const data = (await res.json()) as { items: Array<{ id: string; code: string; name: string }>; total: number; limit: number; offset: number };
  return {
    items: data.items.map((item) => ({ id: item.id, code: item.code, name: item.name })),
    total: data.total,
    limit: data.limit,
    offset: data.offset,
  };
}
