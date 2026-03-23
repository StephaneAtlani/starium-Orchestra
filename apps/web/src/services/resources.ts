/** Retour de `useAuthenticatedFetch()`. */
export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type ResourceType = 'HUMAN' | 'MATERIAL' | 'LICENSE';

export type ResourceAffiliation = 'INTERNAL' | 'EXTERNAL';

export type ResourceListItem = {
  id: string;
  name: string;
  firstName: string | null;
  code: string | null;
  type: ResourceType;
  isActive: boolean;
  email: string | null;
  affiliation: ResourceAffiliation | null;
  companyName: string | null;
  dailyRate: string | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string; code: string | null } | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type ResourceRoleItem = {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listResources(
  authFetch: AuthFetch,
  params: {
    offset?: number;
    limit?: number;
    type?: ResourceType;
    isActive?: boolean;
    search?: string;
  },
): Promise<Paginated<ResourceListItem>> {
  const sp = new URLSearchParams();
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.type) sp.set('type', params.type);
  if (params.isActive !== undefined) sp.set('isActive', String(params.isActive));
  if (params.search) sp.set('search', params.search);
  const q = sp.toString();
  const res = await authFetch(`/api/resources${q ? `?${q}` : ''}`);
  if (!res.ok) {
    let msg = 'Impossible de charger la liste des ressources.';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) {
        msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      /* corps non JSON */
    }
    if (res.status === 404) {
      msg =
        'Route API introuvable (404). Vérifiez que le backend inclut le module resources ; sous Docker, rebuild web avec INTERNAL_API_URL=http://api:3001 (rewrites vers le conteneur api).';
    }
    if (res.status === 403) {
      msg =
        'Accès refusé : le module Ressources est désactivé pour ce client ou vos droits sont insuffisants.';
    }
    if (res.status === 401) {
      msg = 'Session expirée ou non authentifié. Reconnectez-vous.';
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function getResource(
  authFetch: AuthFetch,
  id: string,
): Promise<ResourceListItem> {
  const res = await authFetch(`/api/resources/${id}`);
  if (!res.ok) throw new Error('Ressource introuvable');
  return res.json();
}

export async function createResource(
  authFetch: AuthFetch,
  body: Record<string, unknown>,
): Promise<ResourceListItem> {
  const res = await authFetch('/api/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Création impossible');
  }
  return res.json();
}

export async function updateResource(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
): Promise<ResourceListItem> {
  const res = await authFetch(`/api/resources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Mise à jour impossible');
  }
  return res.json();
}

export async function deactivateResource(
  authFetch: AuthFetch,
  id: string,
): Promise<ResourceListItem> {
  const res = await authFetch(`/api/resources/${id}/deactivate`, { method: 'POST' });
  if (!res.ok) throw new Error('Désactivation impossible');
  return res.json();
}

export async function listResourceRoles(
  authFetch: AuthFetch,
  params: { offset?: number; limit?: number; search?: string },
): Promise<Paginated<ResourceRoleItem>> {
  const sp = new URLSearchParams();
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.search) sp.set('search', params.search);
  const q = sp.toString();
  const res = await authFetch(`/api/resource-roles${q ? `?${q}` : ''}`);
  if (!res.ok) throw new Error('Liste rôles métier impossible');
  return res.json();
}

export async function createResourceRole(
  authFetch: AuthFetch,
  body: { name: string; code?: string | null },
): Promise<ResourceRoleItem> {
  const res = await authFetch('/api/resource-roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Création rôle impossible');
  return res.json();
}

export async function updateResourceRole(
  authFetch: AuthFetch,
  id: string,
  body: { name?: string; code?: string | null },
): Promise<ResourceRoleItem> {
  const res = await authFetch(`/api/resource-roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Mise à jour rôle impossible');
  return res.json();
}
