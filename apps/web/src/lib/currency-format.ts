const LOCALE = 'fr-FR';

/**
 * `Intl` fr-FR utilise souvent U+202F (espace fin insécable) comme séparateur de milliers.
 * On normalise en espace U+0020 pour un rendu explicite « 1 234 567 ».
 */
export function normalizeFrNumberGrouping(value: string): string {
  return value.replace(/\u202f|\u00a0/g, ' ');
}

/**
 * Entier ou décimal formaté locale fr-FR, séparateurs de milliers en espaces normaux.
 */
export function formatNumberFr(
  value: number,
  options?: { minFraction?: number; maxFraction?: number },
): string {
  const min = options?.minFraction ?? 0;
  const max = options?.maxFraction ?? 0;
  return normalizeFrNumberGrouping(
    new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(value),
  );
}

/**
 * Montant formaté avec symbole devise (ex. 3 600 €), pas le code ISO.
 */
export function formatCurrencyAmountFr(value: number, currencyCode: string): string {
  try {
    return normalizeFrNumberGrouping(
      new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    );
  } catch {
    return formatNumberFr(value);
  }
}

/**
 * Symbole seul pour affichage à côté d’un montant déjà formaté (cartes KPI).
 */
export function getCurrencySymbol(currencyCode: string): string {
  try {
    const parts = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const cur = parts.find((p) => p.type === 'currency');
    return cur?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}
