import type { ChildWorkflowCascadeCounts } from '../types/budget-management.types';
import type { BudgetWorkflowStatus } from '../constants/budget-workflow-status';

/** Aligné sur la logique API `requiresCascadeChildWorkflowConfirmation`. */
export function budgetStatusChangeNeedsCascadeConfirmation(
  from: BudgetWorkflowStatus,
  to: BudgetWorkflowStatus,
  counts: ChildWorkflowCascadeCounts,
): boolean {
  if (to === 'SUBMITTED' && from === 'DRAFT') {
    return counts.draftEnvelopeCount > 0 || counts.draftLineCount > 0;
  }
  if (
    to === 'VALIDATED' &&
    (from === 'SUBMITTED' || from === 'REVISED')
  ) {
    return (
      counts.draftEnvelopeCount > 0 ||
      counts.pendingValidationEnvelopeCount > 0 ||
      counts.draftLineCount > 0 ||
      counts.pendingValidationLineCount > 0
    );
  }
  return false;
}
