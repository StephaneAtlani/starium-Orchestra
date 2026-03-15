'use client';

import { useMemo } from 'react';
import type { Budget, BudgetEnvelope, BudgetLine } from '../types/budget-management.types';
import type { BudgetExplorerFilters, ExplorerNode } from '../types/budget-explorer.types';
import { buildBudgetTree } from '../lib/build-budget-tree';
import { filterBudgetTree } from '../lib/filter-budget-tree';

/**
 * Construit tree et filteredTree avec useMemo.
 * Séparation claire : tree = source complète, filteredTree = vue filtrée pour affichage.
 */
export function useBudgetExplorerTree(
  budget: Budget | null,
  envelopes: BudgetEnvelope[] | null,
  lines: BudgetLine[] | null,
  filters: BudgetExplorerFilters,
): { tree: ExplorerNode[]; filteredTree: ExplorerNode[] } {
  const tree = useMemo(() => {
    if (!budget || !envelopes || !lines) return [];
    return buildBudgetTree(envelopes, lines, budget);
  }, [budget, envelopes, lines]);

  const filteredTree = useMemo(() => {
    return filterBudgetTree(tree, filters);
  }, [tree, filters]);

  return { tree, filteredTree };
}
