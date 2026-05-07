/**
 * API cockpit licences — RFC-ACL-010.
 *
 * Source de vérité backend : on réutilise les endpoints existants
 * (`/api/users`, `/api/client-license-usage`, `/api/platform/clients/:clientId/...`)
 * et le nouvel endpoint plateforme `/api/platform/clients/:clientId/users`
 * (RFC-ACL-010) qui renvoie la même shape que `GET /api/users`.
 */

import type { ClientMember } from '@/features/client-rbac/api/user-roles';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

/** Shape backend `UserResponse` côté cockpit, alignée RFC-ACL-010. */
export interface CockpitMember extends ClientMember {
  licenseType: 'READ_ONLY' | 'READ_WRITE' | string;
  licenseBillingMode:
    | 'CLIENT_BILLABLE'
    | 'EXTERNAL_BILLABLE'
    | 'NON_BILLABLE'
    | 'PLATFORM_INTERNAL'
    | 'EVALUATION'
    | string;
  subscriptionId: string | null;
  licenseStartsAt: string | null;
  licenseEndsAt: string | null;
  licenseAssignmentReason: string | null;
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

/**
 * GET /api/platform/clients/:clientId/users — RFC-ACL-010.
 *
 * Endpoint **isolé du client actif** : utilisé exclusivement par le
 * cockpit plateforme pour récupérer les membres + licences d'un client
 * donné, sans dépendre de `X-Client-Id`.
 */
export async function getPlatformClientUsers(
  authFetch: AuthFetch,
  clientId: string,
): Promise<CockpitMember[]> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/users`,
  );
  return handleResponse<CockpitMember[]>(res);
}
