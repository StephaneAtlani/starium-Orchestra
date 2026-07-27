/**
 * Évaluation fournisseur — saisie sur 5 avec un chiffre après la virgule.
 * Le backend valide la même plage (`CreateSupplierDto.performanceRating`).
 */

export const SUPPLIER_RATING_MIN = 1;
export const SUPPLIER_RATING_MAX = 5;

/**
 * Convertit une saisie utilisateur en note exploitable par l'API.
 *
 * Accepte la virgule décimale française comme le point. Renvoie `null` si la
 * saisie est vide (fournisseur non évalué) ou invalide — l'appelant distingue
 * les deux via `isBlank`.
 */
export function parseSupplierRating(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(',', '.');
  if (!/^\d(?:\.\d)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (value < SUPPLIER_RATING_MIN || value > SUPPLIER_RATING_MAX) return null;

  return value;
}

/** `true` si la saisie est vide — remet le fournisseur à « non évalué ». */
export function isBlankSupplierRating(raw: string): boolean {
  return raw.trim().length === 0;
}

/**
 * Valeur à envoyer à l'API : `null` pour effacer la note, le nombre sinon,
 * `undefined` si la saisie est invalide (le formulaire bloque avant l'envoi).
 */
export function supplierRatingPayloadValue(raw: string): number | null | undefined {
  if (isBlankSupplierRating(raw)) return null;
  const parsed = parseSupplierRating(raw);
  return parsed ?? undefined;
}
