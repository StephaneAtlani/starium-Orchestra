/**
 * Normalisation "UX" (pas une règle métier).
 * Objectif: réduire les doublons évidents côté interface.
 */
export function normalizeSupplierName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

