import { FLAG_KEYS } from '../feature-flags/flag-keys';

/** Plafond d’évaluation en mémoire par catégorie (RFC-ACL-021) — liste UI. */
export const ACCESS_MODEL_SCAN_CAP = 10_000;

/** Export CSV (RFC-ACL-026) — jamais de fichier partiel au-delà de ce seuil. */
export const ACCESS_MODEL_MAX_EXPORT_ROWS = 5_000;

/** Probe export : charge max N+1 lignes pour décider 413. Invariant : SCAN_CAP >= EXPORT_PROBE_LIMIT. */
export const ACCESS_MODEL_EXPORT_PROBE_LIMIT =
  ACCESS_MODEL_MAX_EXPORT_ROWS + 1;

/** KPI missing_owner : warning si total dans ]0, MAX], pending si > MAX. */
export const ACCESS_MODEL_CHECKLIST_OWNER_WARNING_MAX = 50;

export const ACCESS_MODEL_DEFAULT_PAGE = 1;
export const ACCESS_MODEL_DEFAULT_LIMIT = 25;
export const ACCESS_MODEL_MAX_LIMIT = 100;

/** ACL WRITE/ADMIN évalués pour `atypical_acl`. */
export const ATYPICAL_ACL_SCAN_CAP = 5_000;

export const ROLLOUT_FLAG_ENTRIES: ReadonlyArray<{
  module: string;
  flagKey: (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];
}> = [
  { module: 'projects', flagKey: FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS },
  { module: 'budgets', flagKey: FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS },
  { module: 'contracts', flagKey: FLAG_KEYS.ACCESS_DECISION_V2_CONTRACTS },
  { module: 'procurement', flagKey: FLAG_KEYS.ACCESS_DECISION_V2_PROCUREMENT },
  {
    module: 'strategic_vision',
    flagKey: FLAG_KEYS.ACCESS_DECISION_V2_STRATEGIC_VISION,
  },
];
