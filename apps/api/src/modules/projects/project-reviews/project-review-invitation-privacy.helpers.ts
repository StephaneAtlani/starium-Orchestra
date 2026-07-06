/** Normalise une adresse email externe (DCP). */
export function normalizeExternalEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Pseudonymise pour audit / logs — jamais l'email en clair. */
export function pseudonymizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0) return '***';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const masked = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${masked}@${domain}`;
}
