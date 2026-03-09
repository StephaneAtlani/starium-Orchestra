export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface MeClient {
  id: string;
  name: string;
  slug: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
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

