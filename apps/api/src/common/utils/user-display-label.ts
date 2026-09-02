/**
 * Libellé métier pour un utilisateur (jamais un ID seul).
 * Aligné sur le pattern budget-snapshots / RFC-BUD-043.
 */
export function resolveCreatedByLabel(
  createdByUser:
    | {
        firstName: string | null;
        lastName: string | null;
        email: string;
      }
    | null
    | undefined,
): string | null {
  if (!createdByUser) return null;
  const fullName = [createdByUser.firstName, createdByUser.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) return fullName;
  return createdByUser.email || null;
}
