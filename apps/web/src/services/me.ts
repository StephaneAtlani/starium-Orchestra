export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformRole: 'PLATFORM_ADMIN' | null;
}

export interface MeClient {
  id: string;
  name: string;
  slug: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  isDefault: boolean;
}

export async function getMe(accessToken: string): Promise<MeProfile> {
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error('Impossible de récupérer le profil utilisateur');
  }
  return (await res.json()) as MeProfile;
}

export async function getMyClients(
  accessToken: string,
): Promise<MeClient[]> {
  const res = await fetch('/api/me/clients', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error('Impossible de récupérer la liste des clients');
  }
  return (await res.json()) as MeClient[];
}

export interface MePermissionsResponse {
  permissionCodes: string[];
}

/** GET /me/permissions — codes de permission pour le client actif (X-Client-Id requis). */
export async function getMyPermissions(
  authenticatedFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): Promise<MePermissionsResponse> {
  const res = await authenticatedFetch('/api/me/permissions');
  if (!res.ok) {
    throw new Error('Impossible de récupérer les permissions');
  }
  return (await res.json()) as MePermissionsResponse;
}

export interface SetDefaultClientResult {
  success: true;
  defaultClientId: string;
}

export async function setDefaultClient(
  accessToken: string,
  clientId: string,
): Promise<SetDefaultClientResult> {
  const res = await fetch('/api/me/default-client', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Impossible de définir le client par défaut');
  }
  return (await res.json()) as SetDefaultClientResult;
}
