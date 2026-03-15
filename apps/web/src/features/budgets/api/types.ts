/**
 * Contrat d'erreur unique pour tous les formulaires budget (RFC-FE-015).
 * Toutes les mutations create/update doivent retourner ou lever une erreur de ce type.
 */

export interface ApiFormError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}
