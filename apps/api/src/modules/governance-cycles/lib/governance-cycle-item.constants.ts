export const GOVERNANCE_CYCLE_ITEM_FK_KEYS = [
  'projectId',
  'budgetId',
  'budgetLineId',
  'strategicObjectiveId',
  'riskId',
] as const;

export const GOVERNANCE_CYCLE_ITEM_IMMUTABLE_PATCH_KEYS = [
  'sourceType',
  ...GOVERNANCE_CYCLE_ITEM_FK_KEYS,
] as const;

export const GOVERNANCE_CYCLE_ITEM_SCORE_KEYS = [
  'valueScore',
  'riskScore',
  'budgetScore',
  'capacityScore',
  'alignmentScore',
] as const;

export const GOVERNANCE_CYCLE_ITEM_EDITION_KEYS = [
  'title',
  'description',
  'estimatedBudgetAmount',
  'estimatedCapacityDays',
  ...GOVERNANCE_CYCLE_ITEM_SCORE_KEYS,
] as const;

export const GOVERNANCE_CYCLE_ITEM_ARBITRATION_KEYS = [
  'decisionStatus',
  'decisionReason',
] as const;

export const MANUAL_ITEM_FK_MESSAGE =
  'Un item MANUAL ne peut pas référencer une entité source';

export const IMMUTABLE_ITEM_SOURCE_MESSAGE =
  'sourceType and source references cannot be changed after creation';
