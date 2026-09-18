/** Affichage libellés procédures — pas de DCP en clair. */

export function maskEmailForDisplay(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'Utilisateur';
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

export function personDisplayLabel(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const name = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (input.email) return maskEmailForDisplay(input.email);
  return 'Membre';
}
