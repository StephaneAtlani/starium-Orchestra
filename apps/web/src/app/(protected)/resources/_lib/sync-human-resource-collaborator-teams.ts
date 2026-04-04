import type { ApiFormError } from '@/features/teams/collaborators/api/collaborators.api';
import { addWorkTeamMember, removeWorkTeamMember } from '@/features/teams/work-teams/api/work-teams.api';
import { resolveCollaboratorIdFromHumanResource } from '@/features/teams/work-teams/lib/resolve-human-resource-to-collaborator';
import type { ResourceListItem } from '@/services/resources';
import type { AuthFetch } from '@/services/resources';

export type TeamMembershipRef = { teamId: string; membershipId: string };

/** Création / rattachement : assure le collaborateur, le manager et les équipes (ajouts idempotents). */
export async function ensureCollaboratorManagerAndTeams(
  authFetch: AuthFetch,
  resource: ResourceListItem,
  managerId: string | null,
  workTeamIds: string[],
): Promise<void> {
  await resolveCollaboratorIdFromHumanResource(authFetch, resource, {
    managerId,
  });
  for (const tid of workTeamIds) {
    try {
      await addWorkTeamMember(authFetch, tid, { resourceId: resource.id, role: 'MEMBER' });
    } catch (e) {
      const err = e as ApiFormError;
      if (err.status === 409) continue;
      throw e;
    }
  }
}

/** Édition : synchronise manager et rattachements équipes (ajouts / retraits). */
export async function syncCollaboratorManagerAndTeams(
  authFetch: AuthFetch,
  resource: ResourceListItem,
  managerId: string | null,
  desiredTeamIds: string[],
  previousMemberships: TeamMembershipRef[],
): Promise<void> {
  await resolveCollaboratorIdFromHumanResource(authFetch, resource, {
    managerId,
  });
  const desired = new Set(desiredTeamIds);
  const prevByTeam = new Map(previousMemberships.map((p) => [p.teamId, p.membershipId]));
  for (const tid of desiredTeamIds) {
    if (!prevByTeam.has(tid)) {
      try {
        await addWorkTeamMember(authFetch, tid, { resourceId: resource.id, role: 'MEMBER' });
      } catch (e) {
        const err = e as ApiFormError;
        if (err.status === 409) continue;
        throw e;
      }
    }
  }
  for (const { teamId, membershipId } of previousMemberships) {
    if (!desired.has(teamId)) {
      await removeWorkTeamMember(authFetch, teamId, membershipId);
    }
  }
}
