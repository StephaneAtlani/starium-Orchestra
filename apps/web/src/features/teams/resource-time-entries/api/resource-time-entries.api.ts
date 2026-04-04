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

export type CreateResourceTimeEntryPayload = {
  resourceId: string;
  workDate: string;
  durationHours: number;
  projectId?: string | null;
  activityTypeId?: string | null;
  notes?: string | null;
};

export type UpdateResourceTimeEntryPayload = Partial<{
  workDate: string;
  durationHours: number;
  projectId: string | null;
  activityTypeId: string | null;
  notes: string | null;
}>;

export async function createResourceTimeEntry(
  authFetch: AuthFetch,
  payload: CreateResourceTimeEntryPayload,
): Promise<ResourceTimeEntriesListResponse['items'][0]> {
  const res = await authFetch('/api/resource-time-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateResourceTimeEntry(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateResourceTimeEntryPayload,
): Promise<ResourceTimeEntriesListResponse['items'][0]> {
  const res = await authFetch(`/api/resource-time-entries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteResourceTimeEntry(
  authFetch: AuthFetch,
  id: string,
): Promise<void> {
  const res = await authFetch(`/api/resource-time-entries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Suppression impossible');
    throw new Error(message);
  }
}
