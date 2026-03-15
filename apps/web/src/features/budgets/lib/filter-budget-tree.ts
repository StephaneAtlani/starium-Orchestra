/**
 * Filtrage côté client de l’arbre explorateur (RFC-FE-004).
 * Recherche name/code, type enveloppe, expenseType — conserve les branches contenant un nœud correspondant.
 */

import type { BudgetExplorerFilters } from '../types/budget-explorer.types';
import type { ExplorerNode } from '../types/budget-explorer.types';

function nodeMatches(node: ExplorerNode, filters: BudgetExplorerFilters): boolean {
  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    const name = node.name.toLowerCase();
    const code = (node.code ?? '').toLowerCase();
    if (!name.includes(term) && !code.includes(term)) return false;
  }
  if (node.type === 'envelope' && filters.envelopeType) {
    if (node.envelopeType !== filters.envelopeType) return false;
  }
  if (node.type === 'line' && filters.expenseType) {
    if (node.expenseType !== filters.expenseType) return false;
  }
  return true;
}

function filterNodes(nodes: ExplorerNode[], filters: BudgetExplorerFilters): ExplorerNode[] {
  if (!filters.search?.trim() && !filters.envelopeType && !filters.expenseType) {
    return nodes;
  }

  const result: ExplorerNode[] = [];
  for (const node of nodes) {
    const filteredChildren =
      node.type === 'envelope' && node.children.length > 0
        ? filterNodes(node.children, filters)
        : node.type === 'line'
          ? []
          : [];

    const selfMatches = nodeMatches(node, filters);
    const hasMatchingDescendant =
      node.type === 'envelope' && filteredChildren.length > 0;

    if (selfMatches || hasMatchingDescendant) {
      if (node.type === 'envelope') {
        result.push({
          ...node,
          children: filteredChildren,
        });
      } else {
        result.push(node);
      }
    }
  }
  return result;
}

/**
 * Retourne un nouvel arbre ne contenant que les nœuds correspondant aux filtres
 * ou ancêtres d’un nœud correspondant.
 */
export function filterBudgetTree(
  tree: ExplorerNode[],
  filters: BudgetExplorerFilters,
): ExplorerNode[] {
  if (!filters.search?.trim() && !filters.envelopeType && !filters.expenseType) {
    return tree;
  }
  return filterNodes(tree, filters);
}
