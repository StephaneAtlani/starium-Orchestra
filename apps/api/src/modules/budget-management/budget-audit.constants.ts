/**
 * RFC-032 — Whitelist MVP des actions affichées dans l’historique décisionnel.
 * Toute action hors liste est ignorée à la lecture (données historiques bruitées).
 *
 * Exclus volontairement : `budget.updated`, `budget_line.updated` — libellés trop vagues
 * (« modifié ») ; les changements utiles passent par les actions sémantiques ou des entrées
 * plus précises (`*.status.changed`, `*.amounts.updated`, `*.planning.*`, etc.).
 */
export const BUDGET_DECISION_HISTORY_ACTIONS = [
  'budget.created',
  'budget.status.changed',
  'budget.workflow_snapshot.failed',
  'budget.reallocated',
  'budget_envelope.created',
  'budget_envelope.updated',
  'budget_line.created',
  'budget_line.status.changed',
  'budget_line.deferred',
  'budget_line.amounts.updated',
  'budget_line.planning.updated',
  'budget_line.planning.applied_mode',
] as const;

export type BudgetDecisionHistoryAction =
  (typeof BUDGET_DECISION_HISTORY_ACTIONS)[number];

export const BUDGET_DECISION_HISTORY_ACTION_SET = new Set<string>(
  BUDGET_DECISION_HISTORY_ACTIONS,
);

export function isBudgetDecisionHistoryAction(
  action: string,
): action is BudgetDecisionHistoryAction {
  return BUDGET_DECISION_HISTORY_ACTION_SET.has(action);
}
