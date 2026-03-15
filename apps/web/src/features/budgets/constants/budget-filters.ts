/**
 * Constantes pour les filtres des listes budgets / exercices (RFC-FE-003).
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

export const LIMIT_OPTIONS = [10, 20, 50] as const;

export const BUDGET_EXERCISE_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'CLOSED', label: 'Clôturé' },
  { value: 'ARCHIVED', label: 'Archivé' },
] as const;

export const BUDGET_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'LOCKED', label: 'Verrouillé' },
  { value: 'ARCHIVED', label: 'Archivé' },
] as const;
