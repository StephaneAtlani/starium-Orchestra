import type { ExplorerNode } from '../types/budget-explorer.types';

/** Seuil RFC-024 : pagination / chargement planning par tranche. */
export const BUDGET_PILOTAGE_PAGE_SIZE = 50;

/**
 * Liste plate des ids de lignes budgétaires (ordre profondeur d’abord, comme le rendu).
 */
export function flattenExplorerBudgetLineIds(nodes: ExplorerNode[]): string[] {
  const ids: string[] = [];
  function walk(n: ExplorerNode) {
    if (n.type === 'line') {
      ids.push(n.id);
      return;
    }
    for (const c of n.children) {
      walk(c);
    }
  }
  for (const root of nodes) {
    walk(root);
  }
  return ids;
}
