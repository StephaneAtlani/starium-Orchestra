import { getCollaboratorById } from '@/features/teams/collaborators/api/collaborators.api';
import { listResources } from '@/services/resources';
import type { AuthFetch } from '@/services/resources';

/**
 * Le manager hiérarchique (Collaborator.managerId) et le lead d'équipe (WorkTeam.leadResourceId)
 * désignent la même personne métier : côté équipes, l'API attend une **Resource** HUMAN.
 * Convertit l'ID collaborateur du manager vers l'ID ressource (email canonique).
 */
export async function findManagerResourceIdForCollaborator(
  authFetch: AuthFetch,
  managerCollaboratorId: string | null | undefined,
): Promise<string> {
  if (!managerCollaboratorId?.trim()) return '';
  const collab = await getCollaboratorById(authFetch, managerCollaboratorId);
  const email = collab.email?.trim().toLowerCase();
  if (!email) return '';
  const list = await listResources(authFetch, {
    type: 'HUMAN',
    search: email,
    limit: 40,
    offset: 0,
  });
  const exact = list.items.find(
    (x) => x.type === 'HUMAN' && x.email?.trim().toLowerCase() === email,
  );
  return exact?.id ?? '';
}
