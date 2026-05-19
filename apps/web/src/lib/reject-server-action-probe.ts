/** En-tête Next.js des Server Actions (POST). */
export const NEXT_ACTION_HEADER = 'next-action';

/**
 * Starium Orchestra n’expose aucune Server Action (`use server`) : le web est
 * API-first (fetch / React Query). Toute requête POST portant `Next-Action`
 * provient d’un scanner (`x`, `test`, …) ou d’un client obsolète après deploy.
 */
export function isServerActionProbe(method: string, nextActionHeader: string | null): boolean {
  if (method !== 'POST') return false;
  const actionId = nextActionHeader?.trim();
  return Boolean(actionId);
}
