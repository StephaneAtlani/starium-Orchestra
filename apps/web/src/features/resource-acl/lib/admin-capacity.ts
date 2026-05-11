/**
 * Capacité ADMIN effective de l'utilisateur courant sur une ressource.
 *
 * La capacité est calculée à partir des entries ACL et des memberships de groupes.
 * Le détail des sources (`USER`/`GROUP`) est conservé pour permettre les règles UX
 * de self-lockout précises (cf. RFC-ACL-013) :
 * - Règle 2 : suppression de la dernière capacité ADMIN bloquée sans confirmation forte.
 * - Règle 3 : suppression d'un GROUP qui porte la seule capacité ADMIN = même règle.
 */

import type { ResourceAclEntry } from '../api/resource-acl.types';

export interface GroupMembershipForCapacity {
  groupId: string;
  memberUserIds: Set<string>;
}

export type AdminCapacitySourceKind = 'USER' | 'GROUP';

export interface AdminCapacitySource {
  source: AdminCapacitySourceKind;
  /** ID de l'`ResourceAclEntry` qui porte la capacité. */
  entryId: string;
  /** Présent uniquement si `source === 'GROUP'`. */
  groupId?: string;
}

export interface AdminCapacitySnapshot {
  count: number;
  sources: AdminCapacitySource[];
}

interface ComputeInput {
  currentUserId: string | undefined;
  entries: ResourceAclEntry[];
  groupMemberships: GroupMembershipForCapacity[];
}

export function computeEffectiveAdminCapacity(
  input: ComputeInput,
): AdminCapacitySnapshot {
  const { currentUserId, entries, groupMemberships } = input;
  if (!currentUserId) {
    return { count: 0, sources: [] };
  }

  const membershipsByGroup = new Map(
    groupMemberships.map((m) => [m.groupId, m.memberUserIds] as const),
  );

  const sources: AdminCapacitySource[] = [];
  for (const entry of entries) {
    if (entry.permission !== 'ADMIN') continue;
    if (entry.subjectType === 'USER') {
      if (entry.subjectId === currentUserId) {
        sources.push({ source: 'USER', entryId: entry.id });
      }
    } else if (entry.subjectType === 'GROUP') {
      const members = membershipsByGroup.get(entry.subjectId);
      if (members?.has(currentUserId)) {
        sources.push({
          source: 'GROUP',
          entryId: entry.id,
          groupId: entry.subjectId,
        });
      }
    }
  }

  return { count: sources.length, sources };
}

/**
 * `true` si la suppression de l'entry `entryId` ferait passer la capacité ADMIN
 * effective de l'utilisateur courant à **0**.
 *
 * - Si `entryId` n'est pas une source ADMIN → renvoie `false` (la suppression n'impacte
 *   pas la capacité).
 * - Si `entryId` est une source mais qu'il en existe d'autres → `false`.
 * - Si `entryId` est la **seule** source → `true`.
 */
export function wouldRemovingEntryRemoveLastAdmin(
  snapshot: AdminCapacitySnapshot,
  entryId: string,
): boolean {
  const isSource = snapshot.sources.some((s) => s.entryId === entryId);
  if (!isSource) return false;
  return snapshot.count <= 1;
}
