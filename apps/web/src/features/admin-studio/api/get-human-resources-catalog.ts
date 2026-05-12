import type { AuthFetch } from '@/features/client-rbac/api/user-roles';

export type HumanCatalogItem = {
  id: string;
  displayName: string;
  email: string | null;
};

export async function getHumanResourcesCatalogForClient(
  authFetch: AuthFetch,
  clientId: string,
  search?: string,
): Promise<{ items: HumanCatalogItem[] }> {
  const sp = new URLSearchParams();
  if (search?.trim()) sp.set('search', search.trim());
  const q = sp.toString();
  const res = await authFetch(
    `/api/clients/${encodeURIComponent(clientId)}/human-resources-catalog${q ? `?${q}` : ''}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur catalogue Humain');
    throw new Error(message);
  }
  return res.json() as Promise<{ items: HumanCatalogItem[] }>;
}
