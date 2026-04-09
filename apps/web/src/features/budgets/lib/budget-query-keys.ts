/**
 * Query keys budget — toutes les clés incluent clientId (tenant-aware).
 * Interdiction : clés sans clientId (ex. ["budgets"], ["budget-detail", budgetId]).
 */

import type { ListBudgetDecisionHistoryQuery } from '../types/budget-management.types';

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

  // Drawer ligne budgétaire (RFC-FE-ADD-006)
  budgetLineDetail: (clientId: string, budgetLineId: string) =>
    ['budgets', clientId, 'budget-line-detail', budgetLineId] as const,

  budgetLineEvents: (clientId: string, budgetLineId: string, filters?: object) =>
    ['budgets', clientId, 'budget-line-events', budgetLineId, filters] as const,

  budgetLineAllocations: (clientId: string, budgetLineId: string, filters?: object) =>
    ['budgets', clientId, 'budget-line-allocations', budgetLineId, filters] as const,

  /**
   * RFC-FE-026 — préfixe timeline (sous-clés : events, allocations, purchase-orders, invoices).
   * Invalider ce préfixe rafraîchit les 4 sources agrégées.
   */
  timeline: (clientId: string, budgetLineId: string) =>
    ['budgets', clientId, 'timeline', budgetLineId] as const,

  budgetLinePurchaseOrders: (clientId: string, budgetLineId: string, filters?: object) =>
    ['budgets', clientId, 'budget-line-purchase-orders', budgetLineId, filters] as const,

  budgetLineInvoices: (clientId: string, budgetLineId: string, filters?: object) =>
    ['budgets', clientId, 'budget-line-invoices', budgetLineId, filters] as const,

  budgetLinePlanning: (clientId: string, lineId: string) =>
    ['budgets', clientId, 'budget-line', lineId, 'planning'] as const,

  dashboard: (clientId: string, params?: object) =>
    ['budgets', clientId, 'dashboard', params] as const,

  /** Préfixe : toutes les requêtes cockpit (params variables). */
  dashboardAll: (clientId: string) => ['budgets', clientId, 'dashboard'] as const,

  /** Préfixe : listes lignes par enveloppe (`budgetLines` avec filtres / pagination). */
  budgetEnvelopeLinesAll: (clientId: string) =>
    ['budgets', clientId, 'budget-lines'] as const,

  /** Liste des mappings d’import CSV/XLSX (scope client) — RFC-018 wizard. */
  budgetImportMappingsList: (clientId: string) =>
    ['budgets', clientId, 'budget-import-mappings'] as const,

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

  /** RFC-FE-BUD-030 — forecast budget */
  budgetForecast: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-forecast', budgetId] as const,

  /** RFC-FE-BUD-030 — forecast enveloppe */
  envelopeForecast: (clientId: string, envelopeId: string) =>
    ['budgets', clientId, 'envelope-forecast', envelopeId] as const,

  /** RFC-FE-BUD-030 — lignes forecast (pagination dans la clé) */
  envelopeForecastLines: (
    clientId: string,
    envelopeId: string,
    params: { limit: number; offset: number },
  ) => ['budgets', clientId, 'envelope-forecast-lines', envelopeId, params] as const,

  /** RFC-FE-BUD-030 — comparaison (targetId dans la clé) */
  budgetComparison: (
    clientId: string,
    budgetId: string,
    compareTo: string,
    targetId: string | undefined,
  ) =>
    ['budgets', clientId, 'budget-comparison', budgetId, compareTo, targetId ?? ''] as const,

  /** Deux snapshots entre eux (GET /budget-comparisons/snapshots) */
  budgetSnapshotPairComparison: (
    clientId: string,
    leftSnapshotId: string,
    rightSnapshotId: string,
  ) =>
    [
      'budgets',
      clientId,
      'budget-comparison',
      'snapshot-pair',
      leftSnapshotId,
      rightSnapshotId,
    ] as const,

  /** Deux versions entre elles (GET /budget-comparisons/versions) */
  budgetVersionPairComparison: (
    clientId: string,
    leftBudgetId: string,
    rightBudgetId: string,
  ) =>
    [
      'budgets',
      clientId,
      'budget-comparison',
      'version-pair',
      leftBudgetId,
      rightBudgetId,
    ] as const,

  /** Liste snapshots (par budget) */
  budgetSnapshotsList: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-snapshots-list', budgetId] as const,

  /** Détail snapshot (par id) */
  budgetSnapshotDetail: (clientId: string, snapshotId: string) =>
    ['budgets', clientId, 'budget-snapshot-detail', snapshotId] as const,

  /** Historique de versions pour sélecteur */
  budgetVersionHistory: (clientId: string, budgetId: string) =>
    ['budgets', clientId, 'budget-version-history', budgetId] as const,

  /** Détail d’un ensemble de versions (GET /budget-version-sets/:id) */
  budgetVersionSetDetail: (clientId: string, versionSetId: string) =>
    ['budgets', clientId, 'budget-version-set', versionSetId] as const,

  /** Liste des version sets (filtre exerciseId optionnel) */
  budgetVersionSetsList: (clientId: string, filters?: { exerciseId?: string }) =>
    ['budgets', clientId, 'budget-version-sets', filters] as const,

  /** RFC-032 — historique décisionnel (timeline audit) */
  budgetDecisionHistory: (
    clientId: string,
    budgetId: string,
    filters?: ListBudgetDecisionHistoryQuery,
  ) => ['budgets', clientId, 'decision-history', budgetId, filters] as const,
};
