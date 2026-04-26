/** Pré-sélection DB par adapter (évite full scan). */
export const SEARCH_ADAPTER_DB_TAKE = 20;

/** Hits max par module après scoring, avant cap global. */
export const SEARCH_MAX_PER_MODULE = 5;

/** Hits max dans toute la réponse. */
export const SEARCH_MAX_GLOBAL = 30;

/** Ordre fonctionnel des groupes (tie-break après score max du groupe). */
export const SEARCH_MODULE_GROUP_ORDER = [
  'projects',
  'budgets',
  'help',
] as const;
