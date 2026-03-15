/**
 * Query keys budget — toutes les clés incluent clientId (tenant-aware).
 * Interdiction : clés sans clientId (ex. ["budgets"], ["budget-detail", budgetId]).
 */

export const budgetQueryKeys = {
  all: (clientId: string) => ['budgets', clientId] as const,

  exercises: (clientId: string, filters?: object) =>
    ['budgets', clientId, 'exercises', filters] as const,

  exerciseSummary: (clientId: string, exerciseId: string) =>
    ['budgets', clientId, 'exercise-summary', exerciseId] as const,

  budgetList: (clientId: string, filters?: object) =>
    ['budgets', clientId, 'budget-list', filters] as const,

  budgetDetail: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-detail', budgetId] as const,

  budgetEnvelopes: (clientId: string, budgetId: string, filters?: object) =>
    ['budgets', clientId, 'budget-envelopes', budgetId, filters] as const,

  budgetLines: (clientId: string, envelopeId: string, filters?: object) =>
    ['budgets', clientId, 'budget-lines', envelopeId, filters] as const,

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
};
