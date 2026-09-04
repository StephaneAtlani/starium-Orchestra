import { describe, expect, it } from 'vitest';
import { filterBudgetTree } from './filter-budget-tree';
import type { ExplorerNode } from '../types/budget-explorer.types';

function envelope(
  id: string,
  children: ExplorerNode[],
): Extract<ExplorerNode, { type: 'envelope' }> {
  return {
    type: 'envelope',
    id,
    parentId: null,
    depth: 0,
    sortOrder: 0,
    name: `Env ${id}`,
    code: id,
    envelopeType: 'RUN',
    status: 'ACTIVE',
    lineCount: children.length,
    totalBudget: 100,
    totalCommitted: 0,
    totalConsumed: 0,
    totalRemaining: 100,
    totalBudgetTtc: null,
    totalCommittedTtc: null,
    totalConsumedTtc: null,
    totalRemainingTtc: null,
    opexAmount: 0,
    capexAmount: 0,
    opexAmountTtc: null,
    capexAmountTtc: null,
    percentOfBudget: 0,
    children,
  };
}

function line(
  id: string,
  expenseType: string,
): Extract<ExplorerNode, { type: 'line' }> {
  return {
    type: 'line',
    id,
    parentId: null,
    depth: 1,
    sortOrder: 0,
    name: `Line ${id}`,
    code: id,
    expenseType,
    status: 'ACTIVE',
    initialAmount: 100,
    initialAmountTtc: null,
    budgetAmount: 100,
    committedAmount: 0,
    consumedAmount: 0,
    remainingAmount: 100,
    budgetAmountTtc: null,
    committedAmountTtc: null,
    consumedAmountTtc: null,
    remainingAmountTtc: null,
    currency: 'EUR',
    description: null,
    children: [],
  };
}

describe('filterBudgetTree — nature CAPEX/OPEX', () => {
  const tree: ExplorerNode[] = [
    envelope('e1', [line('l-capex', 'CAPEX'), line('l-opex', 'OPEX')]),
    envelope('e2', [line('l-opex-only', 'OPEX')]),
  ];

  it('ne garde que les lignes CAPEX et les enveloppes qui en contiennent', () => {
    const filtered = filterBudgetTree(tree, { expenseType: 'CAPEX' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe('envelope');
    if (filtered[0]?.type !== 'envelope') return;
    expect(filtered[0].children).toHaveLength(1);
    expect(filtered[0].children[0]?.id).toBe('l-capex');
  });

  it('ne laisse pas d’enveloppe vide quand aucune ligne ne matche', () => {
    const filtered = filterBudgetTree(tree, { expenseType: 'CAPEX' });
    expect(filtered.some((n) => n.id === 'e2')).toBe(false);
  });
});
