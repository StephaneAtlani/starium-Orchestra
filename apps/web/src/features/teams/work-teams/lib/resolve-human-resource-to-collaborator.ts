import { createCollaborator, listCollaborators } from '@/features/teams/collaborators/api/collaborators.api';
import type { AuthFetch } from '@/services/resources';
import type { ResourceListItem } from '@/services/resources';

/**
 * Rattache une ressource catalogue « Humaine » au référentiel Collaborateur :
 * réutilise un collaborateur existant (même email) ou crée un collaborateur MANUAL.
 */
export async function resolveCollaboratorIdFromHumanResource(
  authFetch: AuthFetch,
  resource: ResourceListItem,
): Promise<string> {
  const email = resource.email?.trim().toLowerCase();
  if (email) {
    const list = await listCollaborators(authFetch, { search: email, limit: 30, offset: 0 });
    const exact = list.items.find((c) => c.email?.trim().toLowerCase() === email);
    if (exact) return exact.id;
  }
  const displayName =
    [resource.firstName?.trim(), resource.name.trim()].filter(Boolean).join(' ') ||
    resource.name.trim();
  const created = await createCollaborator(authFetch, {
    displayName,
    firstName: resource.firstName?.trim() || null,
    lastName: resource.name.trim(),
    email: resource.email?.trim() ? resource.email.trim() : null,
  });
  return created.id;
}
