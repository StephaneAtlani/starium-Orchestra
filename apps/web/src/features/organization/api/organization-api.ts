import { stariumApiPath } from '@/lib/starium-api-base';

export type OrgUnitTreeNode = {
  id: string;
  clientId: string;
  parentId: string | null;
  code: string | null;
  name: string;
  description: string | null;
  type: string;
  status: string;
  sortOrder: number;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  children: OrgUnitTreeNode[];
};

export type OrgGroupRow = {
  id: string;
  clientId: string;
  code: string | null;
  name: string;
  description: string | null;
  type: string;
  status: string;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type OrgMembershipRow = {
  id: string;
  memberType: string;
  roleTitle?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  groupId?: string;
  orgUnitId?: string;
  resource: {
    id: string;
    name: string;
    firstName: string | null;
    type: string;
    email: string | null;
    code: string | null;
  };
  linkedUserEmail: string | null;
};

export type AuditLogRow = {
  id: string;
  clientId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
};

export type ResourceListItem = {
  id: string;
  name: string;
  firstName: string | null;
  code: string | null;
  type: string;
  email: string | null;
  linkedUserId: string | null;
};

export async function fetchHumanResources(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<ResourceListItem[]> {
  const qs = new URLSearchParams({ type: 'HUMAN', limit: '200', offset: '0' });
  const res = await authFetch(stariumApiPath(`/api/resources?${qs.toString()}`));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const body = (await res.json()) as { items: ResourceListItem[] };
  return body.items ?? [];
}

export async function fetchOrgUnitsTree(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<OrgUnitTreeNode[]> {
  const res = await authFetch(stariumApiPath('/api/organization/units'));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function fetchOrgGroups(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<OrgGroupRow[]> {
  const res = await authFetch(stariumApiPath('/api/organization/groups'));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function fetchUnitMembers(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  unitId: string,
): Promise<OrgMembershipRow[]> {
  const res = await authFetch(stariumApiPath(`/api/organization/units/${encodeURIComponent(unitId)}/members`));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function fetchGroupMembers(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  groupId: string,
): Promise<OrgMembershipRow[]> {
  const res = await authFetch(stariumApiPath(`/api/organization/groups/${encodeURIComponent(groupId)}/members`));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function fetchOrganizationAudit(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<AuditLogRow[]> {
  const qs = new URLSearchParams({
    actionPrefix: 'organization.',
    limit: '100',
    offset: '0',
  });
  const res = await authFetch(stariumApiPath(`/api/audit-logs?${qs.toString()}`));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function postJson<T>(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  path: string,
  body: unknown,
): Promise<T> {
  const res = await authFetch(stariumApiPath(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function patchJson<T>(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  path: string,
  body: unknown,
): Promise<T> {
  const res = await authFetch(stariumApiPath(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function deleteMember(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  kind: 'units' | 'groups',
  parentId: string,
  membershipId: string,
): Promise<void> {
  const base =
    kind === 'units'
      ? `/api/organization/units/${encodeURIComponent(parentId)}/members/${encodeURIComponent(membershipId)}`
      : `/api/organization/groups/${encodeURIComponent(parentId)}/members/${encodeURIComponent(membershipId)}`;
  const res = await authFetch(stariumApiPath(base), { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
}
