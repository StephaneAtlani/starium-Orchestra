/**
 * Cycle de vie budget (`BudgetStatus` Prisma) — aligné API / seed.
 * Ancien ACTIVE → VALIDATED (budget opérationnel).
 */
export const BUDGET_WORKFLOW_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'REVISED',
  'VALIDATED',
  'LOCKED',
  'ARCHIVED',
] as const;

export type BudgetWorkflowStatus = (typeof BUDGET_WORKFLOW_STATUSES)[number];

export const BUDGET_WORKFLOW_STATUS_LABELS: Record<BudgetWorkflowStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  REVISED: 'Révisé',
  VALIDATED: 'Validé',
  LOCKED: 'Verrouillé',
  ARCHIVED: 'Archivé',
};
