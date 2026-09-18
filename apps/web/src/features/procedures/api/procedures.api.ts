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
    includeArchived?: boolean;
  },
): Promise<ProcedureListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  if (params?.q) sp.set('q', params.q);
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
