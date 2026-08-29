/**
 * RFC-BUD-041 C6 — totaux officiels d’une fiche budget.
 * PENDING restent visibles dans la grille mais hors sommes si le budget est validé.
 */
export function isLineIncludedInFicheTotals(
  lineStatus: string,
  budgetStatus: string,
): boolean {
  if (
    budgetStatus === 'VALIDATED' ||
    budgetStatus === 'LOCKED' ||
    budgetStatus === 'ARCHIVED'
  ) {
    return lineStatus === 'ACTIVE' || lineStatus === 'CLOSED';
  }
  return (
    lineStatus === 'ACTIVE' ||
    lineStatus === 'PENDING_VALIDATION' ||
    lineStatus === 'CLOSED'
  );
}
