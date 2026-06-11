import { GovernanceCycleStatus } from '@prisma/client';
import { isGovernanceCyclesModuleActive } from '../governance-cycles/lib/governance-cycles-module.util';

/** Cycle ouvert au pool candidatures projet (hors clôturé / archivé). */
export const GOVERNANCE_CYCLE_ACTIVE_FOR_PROJECT_REQUEST_POOL: GovernanceCycleStatus[] =
  [
    GovernanceCycleStatus.DRAFT,
    GovernanceCycleStatus.PREPARING,
    GovernanceCycleStatus.TO_ARBITRATE,
    GovernanceCycleStatus.ARBITRATED,
    GovernanceCycleStatus.IN_EXECUTION,
  ];

export function isGovernanceCycleActiveForProjectRequestPool(
  status: GovernanceCycleStatus,
): boolean {
  return GOVERNANCE_CYCLE_ACTIVE_FOR_PROJECT_REQUEST_POOL.includes(status);
}

export { isGovernanceCyclesModuleActive };
