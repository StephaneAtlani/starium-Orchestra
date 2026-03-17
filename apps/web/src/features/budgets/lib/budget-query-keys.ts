/**
 * Query keys budget — toutes les clés incluent clientId (tenant-aware).
 * Interdiction : clés sans clientId (ex. ["budgets"], ["budget-detail", budgetId]).
 */

export const budgetQueryKeys = {
  all: (clientId: string) => ['budgets', clientId] as const,

  exercises: (clientId: string, filters?: object) =>
    ['budgets', clientId, 'exercises', filters] as const,

  /** id = segment de route [id] (/budgets/exercises/[id]/edit) — RFC-FE-015 */
  exerciseDetail: (clientId: string, id: string) =>
    ['budgets', clientId, 'exercise-detail', id] as const,

  exerciseSummary: (clientId: string, exerciseId: string) =>
    ['budgets', clientId, 'exercise-summary', exerciseId] as const,

  budgetList: (clientId: string, filters?: object) =>
    ['budgets', clientId, 'budget-list', filters] as const,

  budgetDetail: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-detail', budgetId] as const,

  budgetEnvelopeDetail: (clientId: string, envelopeId: string) =>
    ['budgets', clientId, 'budget-envelope-detail', envelopeId] as const,

  /** options.full === true pour l’explorer (toutes les enveloppes) ; sans options = listes paginées */
  budgetEnvelopes: (
    clientId: string,
    budgetId: string,
    options?: { full?: boolean },
  ) => ['budgets', clientId, 'budget-envelopes', budgetId, options] as const,

  budgetLines: (clientId: string, envelopeId: string, filters?: object) =>
    ['budgets', clientId, 'budget-lines', envelopeId, filters] as const,

  /** Toutes les lignes du budget (explorer) — sans filtres API */
  budgetLinesByBudget: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-lines-by-budget', budgetId] as const,

  budgetSummary: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-summary', budgetId] as const,

  dashboard: (clientId: string, params?: object) =>
    ['budgets', clientId, 'dashboard', params] as const,

  // Sous-domaines futurs (snapshots, versions, reallocations, imports)
  snapshots: (clientId: string, budgetId: string, filters?: object) =>
    ['budgets', clientId, 'snapshots', budgetId, filters] as const,

  versions: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'versions', budgetId] as const,

  reallocations: (clientId: string, budgetId: string, filters?: object) =>
    ['budgets', clientId, 'reallocations', budgetId, filters] as const,

  imports: (clientId: string, budgetId: string, filters?: object) =>
    ['budgets', clientId, 'imports', budgetId, filters] as const,

  // Listes paginées (RFC-FE-003) — clés conformes RFC §7.1
  budgetExercisesList: (clientId: string, filters?: object) =>
    ['budget-exercises', clientId, filters] as const,
  budgetsList: (clientId: string, filters?: object) =>
    ['budgets', clientId, filters] as const,
  budgetExerciseOptions: (clientId: string) =>
    ['budget-exercise-options', clientId] as const,

  generalLedgerAccountOptions: (clientId: string) =>
    ['general-ledger-account-options', clientId] as const,
};
