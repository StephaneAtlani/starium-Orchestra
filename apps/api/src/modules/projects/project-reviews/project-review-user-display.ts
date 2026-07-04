/** Libellé lisible pour un utilisateur plateforme (jamais l'ID seul). */
export function formatProjectReviewUserDisplayName(
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null | undefined,
): string | null {
  if (!user) return null;
  const parts = [user.firstName, user.lastName].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(' ').trim();
  return user.email ?? null;
}

export const projectReviewUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;
