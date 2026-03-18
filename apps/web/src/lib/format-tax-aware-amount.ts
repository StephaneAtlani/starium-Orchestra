export type TaxDisplayMode = 'HT' | 'TTC';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number, currency: string): string {
  return `${formatNumber(value)} ${currency}`;
}

/**
 * Helper unique pour afficher des montants avec label explicite HT/TTC.
 * - budgets : en mode `TTC`, on affiche une projection (marquage `≈`) si la valeur TTC est connue.
 * - si la valeur TTC est indisponible (taxRate absent côté backend), on reste en affichage HT.
 */
export function formatTaxAwareAmount(params: {
  htValue: number;
  ttcValue: number | null;
  currency: string;
  mode: TaxDisplayMode;
  /**
   * Marque "≈" pour les TTC budgétés/projetés.
   * - Pour les transactions TTC réelles : false
   * - Pour les budgets en TTC mismatch : true
   */
  isApproximation?: boolean;
}): string {
  const { htValue, ttcValue, currency, mode, isApproximation } = params;
  const approx = isApproximation ?? true;

  if (mode === 'HT') {
    return `${formatCurrency(htValue, currency)} HT`;
  }

  if (ttcValue != null) {
    return approx
      ? `≈ ${formatCurrency(ttcValue, currency)} TTC`
      : `${formatCurrency(ttcValue, currency)} TTC`;
  }

  return `${formatCurrency(htValue, currency)} HT`;
}

