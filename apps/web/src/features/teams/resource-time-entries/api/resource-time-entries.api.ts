import type {
  ResourceTimeEntriesListParams,
  ResourceTimeEntriesListResponse,
} from '../types/resource-time-entry.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

function toQueryString(
  record: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined || v === null) continue;
    search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur lors de la requête');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function listResourceTimeEntries(
  authFetch: AuthFetch,
  params: ResourceTimeEntriesListParams = {},
): Promise<ResourceTimeEntriesListResponse> {
  const res = await authFetch(
    `/api/resource-time-entries${toQueryString({
      offset: params.offset,
      limit: params.limit,
      resourceId: params.resourceId,
      projectId: params.projectId,
      status: params.status,
      from: params.from,
      to: params.to,
    })}`,
  );
  return handleResponse<ResourceTimeEntriesListResponse>(res);
}
