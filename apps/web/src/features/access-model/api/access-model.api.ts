export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type AccessModelIssueCategory =
  | 'missing_owner'
  | 'missing_human'
  | 'atypical_acl'
  | 'policy_review';

export interface AccessModelRolloutEntry {
  module: string;
  flagKey: string;
  enabled: boolean;
}

export type AccessModelChecklistStatus = 'ok' | 'warning' | 'pending';

export interface AccessModelChecklistStep {
  id: string;
  label: string;
  status: AccessModelChecklistStatus;
  detail?: string;
  href?: string;
}

export interface AccessModelHealth {
  generatedAt: string;
  rollout: AccessModelRolloutEntry[];
  checklist: AccessModelChecklistStep[];
  kpis: {
    resourcesMissingOwner: { total: number; byModule: Record<string, number> };
    membersMissingHumanWithScopedPerms: { total: number };
    atypicalAclShares: { total: number };
    policyReviewHints: { total: number };
  };
}

export interface AccessModelIssue {
  id: string;
  resourceId: string;
  category: AccessModelIssueCategory;
  resourceType?: string;
  module: string;
  label: string;
  subtitle?: string;
  ownerOrgUnitSource?: 'self' | 'parent';
  severity: 'warning' | 'info';
  correctiveAction: { kind: 'link'; href: string; label: string };
}

export interface AccessModelIssuesResponse {
  items: AccessModelIssue[];
  page: number;
  limit: number;
  total: number;
  truncated: boolean;
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

export async function getAccessModelHealth(
  authFetch: AuthFetch,
): Promise<AccessModelHealth> {
  const res = await authFetch('/api/access-model/health');
  return handleResponse<AccessModelHealth>(res);
}

export interface ListAccessModelIssuesParams {
  category: AccessModelIssueCategory;
  page?: number;
  limit?: number;
  module?: string;
  search?: string;
}

export async function listAccessModelIssues(
  authFetch: AuthFetch,
  params: ListAccessModelIssuesParams,
): Promise<AccessModelIssuesResponse> {
  const q = new URLSearchParams();
  q.set('category', params.category);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.module?.trim()) q.set('module', params.module.trim());
  if (params.search?.trim()) q.set('search', params.search.trim());
  const res = await authFetch(`/api/access-model/issues?${q.toString()}`);
  return handleResponse<AccessModelIssuesResponse>(res);
}

export interface ExportAccessModelIssuesParams {
  category: AccessModelIssueCategory;
  module?: string;
  search?: string;
  delimiter?: ',' | ';';
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="([^"]+)"/i.exec(header);
  return match?.[1] ?? null;
}

export async function downloadAccessModelIssuesCsv(
  authFetch: AuthFetch,
  params: ExportAccessModelIssuesParams,
): Promise<void> {
  const q = new URLSearchParams();
  q.set('category', params.category);
  if (params.module?.trim()) q.set('module', params.module.trim());
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.delimiter) q.set('delimiter', params.delimiter);
  const url = `/api/access-model/issues/export?${q.toString()}`;
  const res = await authFetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de l’export');
    throw new Error(message);
  }
  const blob = await res.blob();
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    `access-model-issues-${params.category}.csv`;
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
