/**
 * Construction de l’arbre explorateur Budget → Enveloppes → Lignes (RFC-FE-004).
 * Logique pure : orphelins à la racine / nœud virtuel « Lignes sans enveloppe ».
 */

import type { Budget, BudgetEnvelope, BudgetLine } from '../types/budget-management.types';
import type {
  ExplorerEnvelopeNode,
  ExplorerLineNode,
  ExplorerNode,
} from '../types/budget-explorer.types';
import { isLineIncludedInFicheTotals } from './budget-fiche-line-totals';

const ORPHAN_LINES_NODE_ID = '__orphan_lines__';

function sumAllKnownOrNull(values: Array<number | null | undefined>): number | null {
  if (values.length === 0) return 0;
  for (const v of values) {
    if (v == null) return null;
  }
  let sum = 0;
  for (const v of values) {
    sum += v as number;
  }
  return sum;
}

function bySortOrderThenName(a: { sortOrder: number | null; name: string }, b: typeof a): number {
  const sa = a.sortOrder ?? 0;
  const sb = b.sortOrder ?? 0;
  if (sa !== sb) return sa - sb;
  return a.name.localeCompare(b.name, 'fr');
}

function byCodeThenName(a: { code: string | null; name: string }, b: typeof a): number {
  const ca = a.code ?? '';
  const cb = b.code ?? '';
  const cmp = ca.localeCompare(cb, 'fr');
  if (cmp !== 0) return cmp;
  return a.name.localeCompare(b.name, 'fr');
}

function lineToNode(line: BudgetLine, depth: number, sortOrder: number): ExplorerLineNode {
  return {
    id: line.id,
    parentId: line.envelopeId,
    depth,
    sortOrder,
    type: 'line',
    code: line.code,
    name: line.name,
    expenseType: line.expenseType,
    status: line.status,
    initialAmount: line.initialAmount ?? 0,
    initialAmountTtc: line.initialAmountTtc ?? null,
    budgetAmount: line.initialAmount ?? 0,
    budgetAmountTtc: line.initialAmountTtc ?? null,
    committedAmount: line.committedAmount ?? 0,
    committedAmountTtc: line.committedAmountTtc ?? null,
    consumedAmount: line.consumedAmount ?? 0,
    consumedAmountTtc: line.consumedAmountTtc ?? null,
    remainingAmount: line.remainingAmount ?? 0,
    remainingAmountTtc: line.remainingAmountTtc ?? null,
    currency: line.currency,
    description: line.description ?? null,
    children: [],
  };
}

export function buildBudgetTree(
  envelopes: BudgetEnvelope[],
  lines: BudgetLine[],
  budget: Budget,
): ExplorerNode[] {
  const currency = budget.currency;
  const envelopeById = new Map<string, BudgetEnvelope>(envelopes.map((e) => [e.id, e]));
  const inTotals = (line: BudgetLine) =>
    isLineIncludedInFicheTotals(line.status, budget.status);

  const totalBudgetScope = lines.reduce(
    (s, l) => s + (inTotals(l) ? (l.initialAmount ?? 0) : 0),
    0,
  );

  const linesByEnvelopeId = new Map<string, BudgetLine[]>();
  const orphanLines: BudgetLine[] = [];
  for (const line of lines) {
    if (envelopeById.has(line.envelopeId)) {
      const list = linesByEnvelopeId.get(line.envelopeId) ?? [];
      list.push(line);
      linesByEnvelopeId.set(line.envelopeId, list);
    } else {
      orphanLines.push(line);
    }
  }

  const rootEnvelopes: BudgetEnvelope[] = [];
  const childrenByParentId = new Map<string, BudgetEnvelope[]>();

  for (const env of envelopes) {
    if (env.parentId == null) {
      rootEnvelopes.push(env);
    } else {
      const parent = envelopeById.get(env.parentId);
      if (parent == null) {
        rootEnvelopes.push(env);
      } else {
        const list = childrenByParentId.get(env.parentId) ?? [];
        list.push(env);
        childrenByParentId.set(env.parentId, list);
      }
    }
  }

  rootEnvelopes.sort(bySortOrderThenName);

  function buildEnvelopeNode(env: BudgetEnvelope, depth: number): ExplorerEnvelopeNode {
    const directLines = (linesByEnvelopeId.get(env.id) ?? []).slice();
    directLines.sort(byCodeThenName);

    const childEnvelopes = (childrenByParentId.get(env.id) ?? []).slice();
    childEnvelopes.sort(bySortOrderThenName);

    const childNodes: ExplorerNode[] = [
      ...childEnvelopes.map((e, i) => buildEnvelopeNode(e, depth + 1)),
      ...directLines.map((l, i) => lineToNode(l, depth + 1, i)),
    ];

    const totaledLines = directLines.filter(inTotals);

    const envelopeBudgetHt = totaledLines.reduce((s, l) => s + (l.initialAmount ?? 0), 0);
    const totalCommitted = totaledLines.reduce((s, l) => s + (l.committedAmount ?? 0), 0);
    const totalConsumed = totaledLines.reduce((s, l) => s + (l.consumedAmount ?? 0), 0);
    const totalRemaining = totaledLines.reduce((s, l) => s + (l.remainingAmount ?? 0), 0);
    const opexAmount = totaledLines
      .filter((l) => l.expenseType === 'OPEX')
      .reduce((s, l) => s + (l.initialAmount ?? 0), 0);
    const capexAmount = totaledLines
      .filter((l) => l.expenseType === 'CAPEX')
      .reduce((s, l) => s + (l.initialAmount ?? 0), 0);
    const envelopeBudgetTtc = sumAllKnownOrNull(
      totaledLines.map((l) => l.initialAmountTtc ?? null),
    );
    const totalCommittedTtc = sumAllKnownOrNull(
      totaledLines.map((l) => l.committedAmountTtc ?? null),
    );
    const totalConsumedTtc = sumAllKnownOrNull(
      totaledLines.map((l) => l.consumedAmountTtc ?? null),
    );
    const totalRemainingTtc = sumAllKnownOrNull(
      totaledLines.map((l) => l.remainingAmountTtc ?? null),
    );
    const opexAmountTtc = sumAllKnownOrNull(
      totaledLines
        .filter((l) => l.expenseType === 'OPEX')
        .map((l) => l.initialAmountTtc ?? null),
    );
    const capexAmountTtc = sumAllKnownOrNull(
      totaledLines
        .filter((l) => l.expenseType === 'CAPEX')
        .map((l) => l.initialAmountTtc ?? null),
    );
    const percentOfBudget =
      totalBudgetScope === 0 ? 0 : (envelopeBudgetHt / totalBudgetScope) * 100;

    return {
      id: env.id,
      parentId: env.parentId,
      depth,
      sortOrder: env.sortOrder ?? 0,
      type: 'envelope',
      name: env.name,
      code: env.code,
      envelopeType: env.type,
      status: env.status,
      lineCount: directLines.length,
      totalBudget: envelopeBudgetHt,
      totalCommitted,
      totalConsumed,
      totalRemaining,
      totalBudgetTtc: envelopeBudgetTtc,
      totalCommittedTtc,
      totalConsumedTtc,
      totalRemainingTtc,
      opexAmount,
      capexAmount,
      opexAmountTtc,
      capexAmountTtc,
      percentOfBudget,
      children: childNodes,
    };
  }

  const rootNodes: ExplorerNode[] = rootEnvelopes.map((e) => buildEnvelopeNode(e, 0));

  if (orphanLines.length > 0) {
    orphanLines.sort(byCodeThenName);
    const orphanLineNodes: ExplorerLineNode[] = orphanLines.map((l, i) =>
      lineToNode(l, 1, i),
    );
    const totaledOrphans = orphanLines.filter(inTotals);
    const orphanBudgetHt = totaledOrphans.reduce((s, l) => s + (l.initialAmount ?? 0), 0);
    const totalCommitted = totaledOrphans.reduce((s, l) => s + (l.committedAmount ?? 0), 0);
    const totalConsumed = totaledOrphans.reduce((s, l) => s + (l.consumedAmount ?? 0), 0);
    const totalRemaining = totaledOrphans.reduce((s, l) => s + (l.remainingAmount ?? 0), 0);
    const opexAmount = totaledOrphans
      .filter((l) => l.expenseType === 'OPEX')
      .reduce((s, l) => s + (l.initialAmount ?? 0), 0);
    const capexAmount = totaledOrphans
      .filter((l) => l.expenseType === 'CAPEX')
      .reduce((s, l) => s + (l.initialAmount ?? 0), 0);
    const orphanBudgetTtc = sumAllKnownOrNull(
      totaledOrphans.map((l) => l.initialAmountTtc ?? null),
    );
    const totalCommittedTtc = sumAllKnownOrNull(
      totaledOrphans.map((l) => l.committedAmountTtc ?? null),
    );
    const totalConsumedTtc = sumAllKnownOrNull(
      totaledOrphans.map((l) => l.consumedAmountTtc ?? null),
    );
    const totalRemainingTtc = sumAllKnownOrNull(
      totaledOrphans.map((l) => l.remainingAmountTtc ?? null),
    );
    const opexAmountTtc = sumAllKnownOrNull(
      totaledOrphans
        .filter((l) => l.expenseType === 'OPEX')
        .map((l) => l.initialAmountTtc ?? null),
    );
    const capexAmountTtc = sumAllKnownOrNull(
      totaledOrphans
        .filter((l) => l.expenseType === 'CAPEX')
        .map((l) => l.initialAmountTtc ?? null),
    );
    const percentOfBudget =
      totalBudgetScope === 0 ? 0 : (orphanBudgetHt / totalBudgetScope) * 100;

    rootNodes.push({
      id: ORPHAN_LINES_NODE_ID,
      parentId: null,
      depth: 0,
      sortOrder: Number.MAX_SAFE_INTEGER,
      type: 'envelope',
      name: 'Lignes sans enveloppe',
      code: null,
      envelopeType: 'TRANSVERSE',
      status: 'DRAFT',
      lineCount: orphanLineNodes.length,
      totalBudget: orphanBudgetHt,
      totalCommitted,
      totalConsumed,
      totalRemaining,
      totalBudgetTtc: orphanBudgetTtc,
      totalCommittedTtc,
      totalConsumedTtc,
      totalRemainingTtc,
      opexAmount,
      capexAmount,
      opexAmountTtc,
      capexAmountTtc,
      percentOfBudget,
      children: orphanLineNodes,
    });
  }

  return rootNodes;
}
