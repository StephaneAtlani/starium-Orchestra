import type { AuthFetch } from '@/services/resources';

export type TimesheetMonthStatus = 'OPEN' | 'SUBMITTED';

export type ResourceTimesheetMonthDto = {
  resourceId: string;
  yearMonth: string;
  status: TimesheetMonthStatus;
  submittedAt: string | null;
  submittedByUserId: string | null;
  unlockedAt: string | null;
  unlockedByUserId: string | null;
  canSubmit: boolean;
  canUnlock: boolean;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur lors de la requête');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getResourceTimesheetMonth(
  authFetch: AuthFetch,
  resourceId: string,
  yearMonth: string,
): Promise<ResourceTimesheetMonthDto> {
  const res = await authFetch(
    `/api/resource-timesheet-months/${encodeURIComponent(resourceId)}/${encodeURIComponent(yearMonth)}`,
  );
  return handleResponse<ResourceTimesheetMonthDto>(res);
}

export async function submitResourceTimesheetMonth(
  authFetch: AuthFetch,
  resourceId: string,
  yearMonth: string,
): Promise<ResourceTimesheetMonthDto> {
  const res = await authFetch(
    `/api/resource-timesheet-months/${encodeURIComponent(resourceId)}/${encodeURIComponent(yearMonth)}/submit`,
    { method: 'POST' },
  );
  return handleResponse<ResourceTimesheetMonthDto>(res);
}

export async function unlockResourceTimesheetMonth(
  authFetch: AuthFetch,
  resourceId: string,
  yearMonth: string,
): Promise<ResourceTimesheetMonthDto> {
  const res = await authFetch(
    `/api/resource-timesheet-months/${encodeURIComponent(resourceId)}/${encodeURIComponent(yearMonth)}/unlock`,
    { method: 'POST' },
  );
  return handleResponse<ResourceTimesheetMonthDto>(res);
}
