import { FLAG_KEYS } from '../feature-flags/flag-keys';

/** Plafond d’évaluation en mémoire par catégorie (RFC-ACL-021). */
export const ACCESS_MODEL_SCAN_CAP = 10_000;

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
