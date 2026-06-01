import { GovernanceCycleItemDecisionStatus } from '@prisma/client';

/** RFC-003 — legacy TO_ARBITRATE reads as CANDIDATE for instance flows. */
export function normalizeItemDecisionStatusForRead(
  status: GovernanceCycleItemDecisionStatus,
): GovernanceCycleItemDecisionStatus {
  if (status === GovernanceCycleItemDecisionStatus.TO_ARBITRATE) {
    return GovernanceCycleItemDecisionStatus.CANDIDATE;
  }
  return status;
}

export function isItemUndecidedForInstanceClose(
  status: GovernanceCycleItemDecisionStatus,
): boolean {
  const normalized = normalizeItemDecisionStatusForRead(status);
  return normalized === GovernanceCycleItemDecisionStatus.CANDIDATE;
}

export const INSTANCE_FINAL_DECISION_STATUSES: GovernanceCycleItemDecisionStatus[] =
  [
    GovernanceCycleItemDecisionStatus.ACCEPTED,
    GovernanceCycleItemDecisionStatus.DEFERRED,
    GovernanceCycleItemDecisionStatus.REJECTED,
    GovernanceCycleItemDecisionStatus.NEEDS_INFORMATION,
    GovernanceCycleItemDecisionStatus.ACCEPTED_WITH_RESERVE,
  ];

export function isValidInstanceFinalDecision(
  status: GovernanceCycleItemDecisionStatus,
): boolean {
  return INSTANCE_FINAL_DECISION_STATUSES.includes(status);
}

/** Reject TO_ARBITRATE on instance decision writes (RFC-003). */
export function assertNotLegacyToArbitrateWrite(
  status: GovernanceCycleItemDecisionStatus,
): void {
  if (status === GovernanceCycleItemDecisionStatus.TO_ARBITRATE) {
    throw new Error('GOVERNANCE_CYCLE_ITEM_STATUS_TO_ARBITRATE_FORBIDDEN');
  }
}
