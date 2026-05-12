import type { AuthFetch, ClientMember } from '@/features/client-rbac/api/user-roles';

export async function patchPlatformClientUserHumanResource(
  authFetch: AuthFetch,
  clientId: string,
  userId: string,
  body: { humanResourceId?: string | null },
): Promise<ClientMember> {
  const res = await authFetch(
    `/api/platform/clients/${encodeURIComponent(clientId)}/users/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const raw = (errBody as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur lors de la mise à jour du lien');
    throw new Error(message);
  }
  return res.json() as Promise<ClientMember>;
}
