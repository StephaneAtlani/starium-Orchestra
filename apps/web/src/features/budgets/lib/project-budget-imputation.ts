/** Disclaimer CODIR — imputation V1 (RFC-PROJ-010-B). */
export const PROJECT_BUDGET_IMPUTATION_DISCLAIMER =
  'Imputation V1 (part FIXED ou % de la ligne) — pas un mouvement FinancialEvent projet. Les montants consommés / engagés sont une lecture proportionnelle, pas une vérité analytique commande/facture par projet.';

export function driftSemanticLabel(driftAmount: number): string {
  if (driftAmount > 0) return 'au-dessus de la cible';
  if (driftAmount < 0) return 'en dessous de la cible';
  return 'à la cible';
}
