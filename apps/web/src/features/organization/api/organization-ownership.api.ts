import { stariumApiPath } from '@/lib/starium-api-base';

export type OrgOwnershipPolicyMode =
  | 'ADVISORY'
  | 'REQUIRED_ON_CREATE'
  | 'REQUIRED_ON_ACTIVATE';

export type OrganizationOwnershipPolicy = {
  mode: OrgOwnershipPolicyMode;
  enforcementEnabled: boolean;
  flagKey: string;
};

export const OWNERSHIP_TRANSFER_RESOURCE_TYPES = [
  'PROJECT',
  'BUDGET',
  'BUDGET_LINE',
  'SUPPLIER',
  'CONTRACT',
  'STRATEGIC_OBJECTIVE',
] as const;

export type OwnershipTransferResourceType =
  (typeof OWNERSHIP_TRANSFER_RESOURCE_TYPES)[number];

export type OwnershipTransferPayload = {
  fromOrgUnitId: string;
  toOrgUnitId: string;
  resourceTypes: OwnershipTransferResourceType[];
  dryRun: boolean;
  confirmApply?: boolean;
  page?: number;
  limit?: number;
};

export type OwnershipTransferPreviewItem = { id: string; label: string };

export type OwnershipTransferResult = {
  dryRun: boolean;
  applied: boolean;
  fromOrgUnitId: string;
  toOrgUnitId: string;
  countsByType: Record<string, number>;
  previews: Array<{
    resourceType: OwnershipTransferResourceType;
    count: number;
    items: OwnershipTransferPreviewItem[];
    page: number;
    limit: number;
  }>;
};

export async function fetchOwnershipPolicy(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<OrganizationOwnershipPolicy> {
  const res = await authFetch(stariumApiPath('/api/organization/ownership-policy'));
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<OrganizationOwnershipPolicy>;
}

export async function patchOwnershipPolicy(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  mode: OrgOwnershipPolicyMode,
): Promise<OrganizationOwnershipPolicy> {
  const res = await authFetch(stariumApiPath('/api/organization/ownership-policy'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<OrganizationOwnershipPolicy>;
}

export async function postOwnershipTransfer(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  payload: OwnershipTransferPayload,
): Promise<OwnershipTransferResult> {
  const res = await authFetch(stariumApiPath('/api/organization/ownership-transfers'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<OwnershipTransferResult>;
}
