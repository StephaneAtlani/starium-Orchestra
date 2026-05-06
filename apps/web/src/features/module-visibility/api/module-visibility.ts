/**
 * API visibilité modules — RFC-ACL-004 (admin client, contexte actif).
 */

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type ModuleVisibilityScopeType = 'CLIENT' | 'GROUP' | 'USER';
export type ModuleVisibilityState = 'VISIBLE' | 'HIDDEN';

export type ModuleVisibilityOverrideRow = {
  id: string;
  scopeType: ModuleVisibilityScopeType;
  scopeId: string | null;
  visibility: ModuleVisibilityState;
  scopeLabel: string;
};

export type ModuleVisibilityMatrixRow = {
  moduleCode: string;
  moduleName: string;
  overrides: ModuleVisibilityOverrideRow[];
};

export type SetModuleVisibilityPayload = {
  moduleCode: string;
  scopeType: ModuleVisibilityScopeType;
  scopeId?: string;
  visibility: ModuleVisibilityState;
};

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

export async function getModuleVisibilityMatrix(
  authFetch: AuthFetch,
): Promise<ModuleVisibilityMatrixRow[]> {
  const res = await authFetch('/api/module-visibility');
  return handleResponse<ModuleVisibilityMatrixRow[]>(res);
}

export async function setModuleVisibility(
  authFetch: AuthFetch,
  payload: SetModuleVisibilityPayload,
): Promise<{ id: string }> {
  const res = await authFetch('/api/module-visibility', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ id: string }>(res);
}

export async function removeModuleVisibility(
  authFetch: AuthFetch,
  params: {
    moduleCode: string;
    scopeType: ModuleVisibilityScopeType;
    scopeId?: string;
  },
): Promise<void> {
  const q = new URLSearchParams({
    moduleCode: params.moduleCode,
    scopeType: params.scopeType,
  });
  if (params.scopeId != null && params.scopeId !== '') {
    q.set('scopeId', params.scopeId);
  }
  const res = await authFetch(`/api/module-visibility?${q.toString()}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? 'Erreur lors de la suppression');
    throw new Error(message);
  }
}
