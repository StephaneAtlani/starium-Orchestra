/**
 * API reporting commercial licences — RFC-ACL-012.
 *
 * Endpoints plateforme uniquement. Les composants UI consomment le
 * dictionnaire KPI canonique (mêmes clés côté API et front).
 */

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type LicenseDistribution = {
  readOnly: number;
  clientBillable: number;
  externalBillable: number;
  nonBillable: number;
  platformInternal: number;
  evaluationActive: number;
  evaluationExpired: number;
  platformInternalActive: number;
  platformInternalExpired: number;
};

export type SubscriptionDistribution = {
  draft: number;
  active: number;
  suspended: number;
  canceled: number;
  expired: number;
  expiredInGrace: number;
};

export type LicenseReportingFilters = {
  clientId?: string;
  licenseBillingMode?: string;
  subscriptionStatus?: string;
};

export type LicenseReportingMonthlyFilters = LicenseReportingFilters & {
  from?: string;
  to?: string;
};

export type LicenseReportingOverview = {
  generatedAt: string;
  scope: 'platform';
  totals: { clients: number; clientUsersActive: number };
  seats: { readWriteBillableUsed: number; readWriteBillableLimit: number };
  licenses: LicenseDistribution;
  subscriptions: SubscriptionDistribution;
};

export type LicenseReportingClientRow = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  clientUsersActive: number;
  seats: { readWriteBillableUsed: number; readWriteBillableLimit: number };
  licenses: LicenseDistribution;
  subscriptions: SubscriptionDistribution;
};

export type LicenseReportingMonthlyPoint = {
  month: string;
  licenses: LicenseDistribution;
  subscriptions: { active: number; suspended: number; expired: number };
};

export type LicenseReportingMonthlySeries = {
  generatedAt: string;
  from: string;
  to: string;
  points: LicenseReportingMonthlyPoint[];
};

async function handle<T>(res: Response): Promise<T> {
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

function buildQuery(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v && v.length > 0) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getLicenseReportingOverview(
  authFetch: AuthFetch,
  filters: LicenseReportingFilters,
): Promise<LicenseReportingOverview> {
  const res = await authFetch(
    `/api/platform/license-reporting/overview${buildQuery(filters)}`,
  );
  return handle<LicenseReportingOverview>(res);
}

export async function getLicenseReportingClients(
  authFetch: AuthFetch,
  filters: LicenseReportingFilters,
): Promise<LicenseReportingClientRow[]> {
  const res = await authFetch(
    `/api/platform/license-reporting/clients${buildQuery(filters)}`,
  );
  return handle<LicenseReportingClientRow[]>(res);
}

export async function getLicenseReportingMonthly(
  authFetch: AuthFetch,
  filters: LicenseReportingMonthlyFilters,
): Promise<LicenseReportingMonthlySeries> {
  const res = await authFetch(
    `/api/platform/license-reporting/monthly${buildQuery(filters)}`,
  );
  return handle<LicenseReportingMonthlySeries>(res);
}

async function downloadBlob(
  authFetch: AuthFetch,
  url: string,
  filename: string,
): Promise<void> {
  const res = await authFetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors du téléchargement');
    throw new Error(message);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadClientsCsv(
  authFetch: AuthFetch,
  filters: LicenseReportingFilters,
): Promise<void> {
  await downloadBlob(
    authFetch,
    `/api/platform/license-reporting/clients.csv${buildQuery(filters)}`,
    'license-reporting-clients.csv',
  );
}

export async function downloadMonthlyCsv(
  authFetch: AuthFetch,
  filters: LicenseReportingMonthlyFilters,
): Promise<void> {
  await downloadBlob(
    authFetch,
    `/api/platform/license-reporting/monthly.csv${buildQuery(filters)}`,
    'license-reporting-monthly.csv',
  );
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
