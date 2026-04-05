type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ClientResourceTimesheetSettingsDto = {
  ignoreWeekendsDefault: boolean;
  allowFractionAboveOne: boolean;
  dayReferenceHours: number;
};

export type PatchClientResourceTimesheetSettingsBody = {
  timesheetIgnoreWeekendsDefault?: boolean;
  timesheetAllowFractionAboveOne?: boolean;
  timesheetDayReferenceHours?: number;
};

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const raw = (body as { message?: string | string[] })?.message;
  const fromArray = Array.isArray(raw) ? raw.join(', ') : raw;
  if (typeof fromArray === 'string' && fromArray.trim()) return fromArray.trim();
  return `Erreur ${res.status} (${res.statusText || 'réseau'})`;
}

export async function getClientResourceTimesheetSettings(
  authFetch: AuthFetch,
): Promise<ClientResourceTimesheetSettingsDto> {
  const res = await authFetch('/api/clients/active/resource-timesheet-settings');
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<ClientResourceTimesheetSettingsDto>;
}

export async function patchClientResourceTimesheetSettings(
  authFetch: AuthFetch,
  body: PatchClientResourceTimesheetSettingsBody,
): Promise<ClientResourceTimesheetSettingsDto> {
  const res = await authFetch('/api/clients/active/resource-timesheet-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<ClientResourceTimesheetSettingsDto>;
}
