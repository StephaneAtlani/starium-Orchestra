import { listCollaborators } from '@/features/teams/collaborators/api/collaborators.api';
import type { ResourceListItem } from '@/services/resources';
import type { AuthFetch } from '@/services/resources';

/** Recherche un collaborateur existant par email (sans création). */
export async function findCollaboratorIdForHumanResource(
  authFetch: AuthFetch,
  resource: Pick<ResourceListItem, 'email'>,
): Promise<string | null> {
  const email = resource.email?.trim().toLowerCase();
  if (!email) return null;
  const list = await listCollaborators(authFetch, { search: email, limit: 30, offset: 0 });
  const exact = list.items.find((c) => c.email?.trim().toLowerCase() === email);
  return exact?.id ?? null;
}
