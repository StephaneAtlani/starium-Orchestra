import type {
  DirectoryConnection,
  DirectoryGroupScope,
  DirectoryProviderGroup,
  DirectorySyncExecution,
  DirectorySyncJob,
  DirectorySyncPreview,
} from '../types/team-sync.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

async function parseJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string })?.message ?? fallback);
  }
  return (await res.json()) as T;
}

export async function listConnections(authFetch: AuthFetch): Promise<DirectoryConnection[]> {
  const res = await authFetch('/api/team-directory/ad-connections');
  return parseJsonOrThrow<DirectoryConnection[]>(
    res,
    'Impossible de charger les connexions annuaire.',
  );
}

export async function createConnection(
  authFetch: AuthFetch,
  payload: Partial<DirectoryConnection> & { name: string },
): Promise<DirectoryConnection> {
  const res = await authFetch('/api/team-directory/ad-connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<DirectoryConnection>(
    res,
    'Impossible de créer la connexion annuaire.',
  );
}

export async function updateConnection(
  authFetch: AuthFetch,
  id: string,
  payload: Partial<DirectoryConnection>,
): Promise<DirectoryConnection> {
  const res = await authFetch(`/api/team-directory/ad-connections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<DirectoryConnection>(
    res,
    'Impossible de mettre à jour la connexion annuaire.',
  );
}

export async function testConnection(authFetch: AuthFetch, id: string): Promise<{ ok: boolean; message: string }> {
  const res = await authFetch(`/api/team-directory/ad-connections/${id}/test`, {
    method: 'POST',
  });
  return parseJsonOrThrow<{ ok: boolean; message: string }>(
    res,
    'Impossible de tester la connexion annuaire.',
  );
}

export async function listGroupScopes(
  authFetch: AuthFetch,
  connectionId: string,
): Promise<DirectoryGroupScope[]> {
  const res = await authFetch(`/api/team-directory/ad-connections/${connectionId}/groups`);
  return parseJsonOrThrow<DirectoryGroupScope[]>(
    res,
    'Impossible de charger les groupes cibles.',
  );
}

export async function listProviderGroups(
  authFetch: AuthFetch,
  connectionId: string,
): Promise<DirectoryProviderGroup[]> {
  const res = await authFetch(
    `/api/team-directory/ad-sync/provider-groups?connectionId=${encodeURIComponent(connectionId)}`,
  );
  const json = await parseJsonOrThrow<{ items: DirectoryProviderGroup[] }>(
    res,
    'Impossible de charger les groupes du provider.',
  );
  return json.items;
}

export async function addGroupScope(
  authFetch: AuthFetch,
  connectionId: string,
  payload: { groupId: string; groupName?: string },
): Promise<DirectoryGroupScope> {
  const res = await authFetch(`/api/team-directory/ad-connections/${connectionId}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<DirectoryGroupScope>(res, 'Impossible d’ajouter le groupe cible.');
}

export async function deleteGroupScope(
  authFetch: AuthFetch,
  connectionId: string,
  groupScopeId: string,
): Promise<void> {
  const res = await authFetch(
    `/api/team-directory/ad-connections/${connectionId}/groups/${groupScopeId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string })?.message ?? 'Impossible de supprimer le groupe cible.');
  }
}

export async function previewSync(
  authFetch: AuthFetch,
  connectionId: string,
): Promise<DirectorySyncPreview> {
  const res = await authFetch('/api/team-directory/ad-sync/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  });
  return parseJsonOrThrow<DirectorySyncPreview>(res, 'Prévisualisation impossible.');
}

export async function executeSync(
  authFetch: AuthFetch,
  connectionId: string,
): Promise<DirectorySyncExecution> {
  const res = await authFetch('/api/team-directory/ad-sync/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  });
  return parseJsonOrThrow<DirectorySyncExecution>(res, 'Synchronisation impossible.');
}

export async function listJobs(authFetch: AuthFetch): Promise<DirectorySyncJob[]> {
  const res = await authFetch('/api/team-directory/ad-sync/jobs');
  return parseJsonOrThrow<DirectorySyncJob[]>(res, 'Impossible de charger les jobs.');
}
