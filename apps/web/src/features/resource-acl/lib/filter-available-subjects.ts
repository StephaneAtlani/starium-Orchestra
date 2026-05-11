/**
 * Helpers purs pour le picker User/Group de l'add-entry-form.
 * Exposés séparément pour pouvoir tester sans dépendre de Select / portails.
 */

import type {
  ResourceAclEntry,
  ResourceAclSubjectType,
} from '../api/resource-acl.types';

export interface SubjectCandidate {
  id: string;
  /** Texte affiché dans la liste (jamais l'UUID seul). */
  label: string;
  /** Texte secondaire optionnel utilisé pour le filtre (ex. email). */
  searchHint?: string;
}

export function filterAvailableSubjects(
  candidates: SubjectCandidate[],
  alreadyAssignedIds: Set<string>,
  search: string,
): SubjectCandidate[] {
  const needle = search.trim().toLowerCase();
  return candidates.filter((c) => {
    if (alreadyAssignedIds.has(c.id)) return false;
    if (!needle) return true;
    const haystack = `${c.label} ${c.searchHint ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function isDuplicateSubject(input: {
  entries: ResourceAclEntry[];
  subjectType: ResourceAclSubjectType;
  subjectId: string;
}): boolean {
  return input.entries.some(
    (e) => e.subjectType === input.subjectType && e.subjectId === input.subjectId,
  );
}

export function alreadyAssignedIdsForSubjectType(
  entries: ResourceAclEntry[],
  subjectType: ResourceAclSubjectType,
): Set<string> {
  return new Set(
    entries.filter((e) => e.subjectType === subjectType).map((e) => e.subjectId),
  );
}
