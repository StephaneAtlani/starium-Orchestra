import {
  BUDGET_WORKFLOW_STATUS_LABELS,
  BUDGET_WORKFLOW_STATUSES,
  type BudgetWorkflowStatus,
} from './budget-workflow-status';

/**
 * Aligné sur `apps/api/src/modules/budget-management/policies/budget-status-transitions.ts`.
 * Toute évolution de matrice : modifier d’abord le backend, puis ce tableau.
 */
const ALLOWED_EDGES: ReadonlyArray<readonly [BudgetWorkflowStatus, BudgetWorkflowStatus]> = [
  ['DRAFT', 'SUBMITTED'],
  ['DRAFT', 'ARCHIVED'],
  ['SUBMITTED', 'REVISED'],
  ['SUBMITTED', 'VALIDATED'],
  ['SUBMITTED', 'DRAFT'],
  ['REVISED', 'VALIDATED'],
  ['REVISED', 'SUBMITTED'],
  ['REVISED', 'DRAFT'],
  ['VALIDATED', 'LOCKED'],
  ['VALIDATED', 'REVISED'],
  ['VALIDATED', 'SUBMITTED'],
  ['VALIDATED', 'ARCHIVED'],
  ['LOCKED', 'ARCHIVED'],
];

/** Statuts affichables en édition : statut courant + cibles autorisées (même ordre que le cycle métier). */
export function budgetStatusSelectOptionsForEdit(current: BudgetWorkflowStatus): {
  value: BudgetWorkflowStatus;
  label: string;
}[] {
  const allowed = new Set<BudgetWorkflowStatus>([current]);
  for (const [from, to] of ALLOWED_EDGES) {
    if (from === current) allowed.add(to);
  }
  return BUDGET_WORKFLOW_STATUSES.filter((s) => allowed.has(s)).map((value) => ({
    value,
    label: BUDGET_WORKFLOW_STATUS_LABELS[value],
  }));
}
