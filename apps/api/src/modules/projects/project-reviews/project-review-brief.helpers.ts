/**
 * Brief de convocation = texte saisi en préparation du point (`objective`).
 * Pas de consignes génériques inventées.
 */
export function resolveAgendaBriefPrepNote(input: {
  objective?: string | null;
}): string | null {
  const text = input.objective?.trim();
  return text || null;
}
