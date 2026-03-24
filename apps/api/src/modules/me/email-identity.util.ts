/** Trim + lowercase pour dédoublonnage et comparaisons. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
