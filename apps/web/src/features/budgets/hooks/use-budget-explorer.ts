'use client';

import { useBudgetDetail } from './use-budgets';
import { useBudgetEnvelopesAll } from './use-budget-envelopes';
import { useBudgetLinesByBudget } from './use-budget-lines';

/**
 * Agrège budget + enveloppes + lignes pour l’explorateur.
 * Ne construit pas l’arbre : exposé pour useBudgetExplorerTree / page.
 */
export function useBudgetExplorer(budgetId: string | null) {
  const budgetQuery = useBudgetDetail(budgetId);
  const envelopesQuery = useBudgetEnvelopesAll(budgetId);
  const linesQuery = useBudgetLinesByBudget(budgetId);

  const isLoading =
    budgetQuery.isLoading || envelopesQuery.isLoading || linesQuery.isLoading;
  const error =
    budgetQuery.error ?? envelopesQuery.error ?? linesQuery.error;

  const refetch = () => {
    void budgetQuery.refetch();
    void envelopesQuery.refetch();
    void linesQuery.refetch();
  };

  return {
    budget: budgetQuery.data ?? null,
    envelopes: envelopesQuery.data ?? null,
    lines: linesQuery.data ?? null,
    isLoading,
    error,
    refetch,
    isSuccess:
      budgetQuery.isSuccess && envelopesQuery.isSuccess && linesQuery.isSuccess,
  };
}
