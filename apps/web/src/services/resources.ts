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
  email: string | null;
  affiliation: ResourceAffiliation | null;
  companyName: string | null;
  dailyRate: string | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string; code: string | null } | null;
  /** Même email qu’un membre client : identité modifiable depuis Membres. */
  linkedUserId: string | null;
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

/** Résultat HTTP explicite — pour les écrans qui ne doivent pas traiter un 403 comme une « panne ». */
export type ListResourcesOutcome =
  | { ok: true; data: Paginated<ResourceListItem> }
  | { ok: false; status: number; message: string };

export async function tryListResources(
  authFetch: AuthFetch,
  params: {
    offset?: number;
    limit?: number;
    type?: ResourceType;
    search?: string;
  },
): Promise<ListResourcesOutcome> {
  const sp = new URLSearchParams();
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.type) sp.set('type', params.type);
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
    return { ok: false, status: res.status, message: msg };
  }
  const data = (await res.json()) as Paginated<ResourceListItem>;
  return { ok: true, data };
}

export async function listResources(
  authFetch: AuthFetch,
  params: {
    offset?: number;
    limit?: number;
    type?: ResourceType;
    search?: string;
  },
): Promise<Paginated<ResourceListItem>> {
  const out = await tryListResources(authFetch, params);
  if (!out.ok) throw new Error(out.message);
  return out.data;
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
