import type { ProjectAssignableUser } from '../../types/project.types';

export function displayNameFromAssignableUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function buildOwnerIdToDisplayMap(users: ProjectAssignableUser[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const u of users) {
    m.set(u.id, displayNameFromAssignableUser(u));
  }
  return m;
}
