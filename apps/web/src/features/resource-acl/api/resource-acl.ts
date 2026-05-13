/**
 * API client RFC-ACL-005 — endpoints `/api/resource-acl/:type/:id`.
 * Tous les endpoints sont protégés par `ClientAdminGuard` côté backend.
 * Le `clientId` est dérivé du contexte client actif (header X-Client-Id) — jamais dans le body.
 */

import type {
  ResourceAclEntry,
  ResourceAclEntryInput,
  ResourceAclListResponse,
  ResourceAclResourceType,
  ResourceAccessPolicyMode,
} from './resource-acl.types';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

/** Mapping erreur uniforme — message générique stable, anti-fuite. */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Vous n'avez pas l'autorisation d'accéder aux permissions de cette ressource");
    }
    if (res.status === 404) {
      throw new Error('Ressource introuvable');
    }
    if (res.status === 409) {
      throw new Error('Conflit : cette permission existe déjà');
    }
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la requête');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function buildPath(
  resourceType: ResourceAclResourceType,
  resourceId: string,
): string {
  return `/api/resource-acl/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`;
}

export async function listResourceAcl(
  authFetch: AuthFetch,
  resourceType: ResourceAclResourceType,
  resourceId: string,
): Promise<ResourceAclListResponse> {
  const res = await authFetch(buildPath(resourceType, resourceId));
  return handleResponse<ResourceAclListResponse>(res);
}

export async function updateResourceAccessPolicy(
  authFetch: AuthFetch,
  resourceType: ResourceAclResourceType,
  resourceId: string,
  mode: ResourceAccessPolicyMode,
): Promise<ResourceAclListResponse> {
  const res = await authFetch(
    `${buildPath(resourceType, resourceId)}/access-policy`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    },
  );
  return handleResponse<ResourceAclListResponse>(res);
}

export async function addResourceAclEntry(
  authFetch: AuthFetch,
  resourceType: ResourceAclResourceType,
  resourceId: string,
  entry: ResourceAclEntryInput,
): Promise<ResourceAclEntry> {
  const res = await authFetch(`${buildPath(resourceType, resourceId)}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return handleResponse<ResourceAclEntry>(res);
}

export async function removeResourceAclEntry(
  authFetch: AuthFetch,
  resourceType: ResourceAclResourceType,
  resourceId: string,
  entryId: string,
): Promise<void> {
  const res = await authFetch(
    `${buildPath(resourceType, resourceId)}/entries/${encodeURIComponent(entryId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Vous n'avez pas l'autorisation de supprimer cette permission");
    }
    if (res.status === 404) {
      throw new Error('Permission introuvable');
    }
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la suppression');
    throw new Error(message);
  }
}

/**
 * `PUT /resource-acl/:type/:id` — replace toutes les entrées.
 * ⚠ Backend impose `entries.length >= 1` ; l'UI V1 n'utilise pas cette route directement
 * (retour mode public via DELETE séquentiel — voir `runSequentialDelete`).
 * Conservé pour cohérence et usages futurs.
 */
export async function replaceResourceAcl(
  authFetch: AuthFetch,
  resourceType: ResourceAclResourceType,
  resourceId: string,
  entries: ResourceAclEntryInput[],
): Promise<ResourceAclListResponse> {
  const res = await authFetch(buildPath(resourceType, resourceId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  return handleResponse<ResourceAclListResponse>(res);
}
