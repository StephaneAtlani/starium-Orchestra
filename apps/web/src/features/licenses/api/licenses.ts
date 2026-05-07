export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type SubscriptionStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELED'
  | 'EXPIRED';

export type SubscriptionBillingPeriod = 'MONTHLY' | 'YEARLY';

export type ClientUserLicenseType = 'READ_ONLY' | 'READ_WRITE';
export type ClientUserLicenseBillingMode =
  | 'CLIENT_BILLABLE'
  | 'NON_BILLABLE'
  | 'PLATFORM_INTERNAL'
  | 'EVALUATION'
  | 'EXTERNAL_BILLABLE';

export interface ClientSubscriptionRow {
  id: string;
  clientId: string;
  status: SubscriptionStatus;
  billingPeriod: SubscriptionBillingPeriod;
  readWriteSeatsLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  graceEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseUsageSubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  graceEndsAt: string | null;
  readWriteSeatsLimit: number;
  readWriteBillableUsed: number;
}

export interface LicenseUsageResponse {
  clientId: string;
  totalReadWriteBillableUsed: number;
  subscriptions: LicenseUsageSubscriptionRow[];
}

export interface CreateClientSubscriptionPayload {
  status?: SubscriptionStatus;
  billingPeriod?: SubscriptionBillingPeriod;
  readWriteSeatsLimit: number;
  startsAt?: string;
  endsAt?: string;
  graceEndsAt?: string;
}

export interface UpdateClientSubscriptionPayload {
  status?: SubscriptionStatus;
  billingPeriod?: SubscriptionBillingPeriod;
  readWriteSeatsLimit?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  graceEndsAt?: string | null;
}

export interface AssignUserLicensePayload {
  licenseType: ClientUserLicenseType;
  licenseBillingMode: ClientUserLicenseBillingMode;
  subscriptionId?: string | null;
  licenseStartsAt?: string | null;
  licenseEndsAt?: string | null;
  licenseAssignmentReason?: string | null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la requête');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getPlatformSubscriptions(
  authFetch: AuthFetch,
  clientId: string,
): Promise<ClientSubscriptionRow[]> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/subscriptions`,
  );
  return handleResponse<ClientSubscriptionRow[]>(res);
}

export async function createPlatformSubscription(
  authFetch: AuthFetch,
  clientId: string,
  payload: CreateClientSubscriptionPayload,
): Promise<ClientSubscriptionRow> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/subscriptions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<ClientSubscriptionRow>(res);
}

export async function updatePlatformSubscription(
  authFetch: AuthFetch,
  clientId: string,
  subscriptionId: string,
  payload: UpdateClientSubscriptionPayload,
): Promise<ClientSubscriptionRow> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<ClientSubscriptionRow>(res);
}

export async function transitionPlatformSubscription(
  authFetch: AuthFetch,
  clientId: string,
  subscriptionId: string,
  action: 'activate' | 'suspend' | 'cancel',
): Promise<ClientSubscriptionRow> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/subscriptions/${encodeURIComponent(subscriptionId)}/${action}`,
    { method: 'POST' },
  );
  return handleResponse<ClientSubscriptionRow>(res);
}

export async function getPlatformLicenseUsage(
  authFetch: AuthFetch,
  clientId: string,
): Promise<LicenseUsageResponse> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/license-usage`,
  );
  return handleResponse<LicenseUsageResponse>(res);
}

export async function getClientLicenseUsage(
  authFetch: AuthFetch,
): Promise<LicenseUsageResponse> {
  const res = await authFetch('/api/client-license-usage');
  return handleResponse<LicenseUsageResponse>(res);
}

export async function assignPlatformUserLicense(
  authFetch: AuthFetch,
  clientId: string,
  userId: string,
  payload: AssignUserLicensePayload,
): Promise<void> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/users/${encodeURIComponent(userId)}/license`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? "Erreur lors de l'affectation de licence");
    throw new Error(message);
  }
}

export async function assignClientUserLicense(
  authFetch: AuthFetch,
  userId: string,
  payload: AssignUserLicensePayload,
): Promise<void> {
  const res = await authFetch(`/api/users/${encodeURIComponent(userId)}/license`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? "Erreur lors de l'affectation de licence");
    throw new Error(message);
  }
}
