/**
 * Tri récursif des nœuds frères dans l’explorateur budget (enveloppes / lignes).
 * Ne modifie pas la logique métier — ordre d’affichage uniquement.
 */

import type { ExplorerNode, ExplorerSortColumn, ExplorerSortState } from '../types/budget-explorer.types';

function tieBreakName(a: ExplorerNode, b: ExplorerNode): number {
  const ca = `${a.code ?? ''}\t${a.name}`.toLowerCase();
  const cb = `${b.code ?? ''}\t${b.name}`.toLowerCase();
  return ca.localeCompare(cb, 'fr');
}

function numericValue(node: ExplorerNode, column: Exclude<ExplorerSortColumn, 'default' | 'name'>): number {
  if (node.type === 'envelope') {
    switch (column) {
      case 'budget':
        return node.totalBudget;
      case 'percent':
        return node.percentOfBudget;
      case 'lines':
        return node.lineCount;
      case 'opex':
        return node.opexAmount;
      case 'capex':
        return node.capexAmount;
      case 'committed':
        return node.totalCommitted;
      case 'consumed':
        return node.totalConsumed;
      case 'remaining':
        return node.totalRemaining;
      default:
        return 0;
    }
  }
  switch (column) {
    case 'budget':
      return node.budgetAmount;
    case 'percent':
      return 0;
    case 'lines':
      return 1;
    case 'opex':
      return node.expenseType === 'OPEX' ? node.budgetAmount : 0;
    case 'capex':
      return node.expenseType === 'CAPEX' ? node.budgetAmount : 0;
    case 'committed':
      return node.committedAmount;
    case 'consumed':
      return node.consumedAmount;
    case 'remaining':
      return node.remainingAmount;
    default:
      return 0;
  }
}

function stringValue(node: ExplorerNode): string {
  return `${node.code ?? ''}\t${node.name}`.toLowerCase();
}

function compare(
  a: ExplorerNode,
  b: ExplorerNode,
  sort: ExplorerSortState,
): number {
  const dir = sort.direction === 'asc' ? 1 : -1;
  if (sort.column === 'name') {
    const sa = stringValue(a);
    const sb = stringValue(b);
    const c = sa.localeCompare(sb, 'fr');
    if (c !== 0) return c * dir;
    return 0;
  }
  const key = sort.column as Exclude<ExplorerSortColumn, 'default' | 'name'>;
  const va = numericValue(a, key);
  const vb = numericValue(b, key);
  if (va !== vb) {
    return va < vb ? -dir : dir;
  }
  return tieBreakName(a, b);
}

/**
 * Applique un tri sur chaque niveau de fratrie. `default` conserve l’ordre source (build + filtre).
 */
export function sortExplorerTree(
  nodes: ExplorerNode[],
  sort: ExplorerSortState,
): ExplorerNode[] {
  if (sort.column === 'default' || nodes.length <= 1) {
    return nodes.map((n) =>
      n.type === 'envelope'
        ? { ...n, children: sortExplorerTree(n.children, sort) }
        : n,
    );
  }

  const sorted = [...nodes].sort((a, b) => compare(a, b, sort));
  return sorted.map((n) =>
    n.type === 'envelope'
      ? { ...n, children: sortExplorerTree(n.children, sort) }
      : n,
  );
}
