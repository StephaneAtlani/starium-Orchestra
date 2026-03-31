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
    revisedAmount: line.revisedAmount ?? 0,
    revisedAmountTtc: line.revisedAmountTtc ?? null,
    committedAmount: line.committedAmount ?? 0,
    committedAmountTtc: line.committedAmountTtc ?? null,
    consumedAmount: line.consumedAmount ?? 0,
    consumedAmountTtc: line.consumedAmountTtc ?? null,
    remainingAmount: line.remainingAmount ?? 0,
    remainingAmountTtc: line.remainingAmountTtc ?? null,
    currency: line.currency,
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

  const totalBudgetRevised = lines.reduce((s, l) => s + (l.revisedAmount ?? 0), 0);

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

    const totalRevised = directLines.reduce((s, l) => s + (l.revisedAmount ?? 0), 0);
    const totalCommitted = directLines.reduce((s, l) => s + (l.committedAmount ?? 0), 0);
    const totalConsumed = directLines.reduce((s, l) => s + (l.consumedAmount ?? 0), 0);
    const totalRemaining = directLines.reduce((s, l) => s + (l.remainingAmount ?? 0), 0);
    const opexAmount = directLines
      .filter((l) => l.expenseType === 'OPEX')
      .reduce((s, l) => s + (l.revisedAmount ?? 0), 0);
    const capexAmount = directLines
      .filter((l) => l.expenseType === 'CAPEX')
      .reduce((s, l) => s + (l.revisedAmount ?? 0), 0);
    const totalRevisedTtc = sumAllKnownOrNull(
      directLines.map((l) => l.revisedAmountTtc ?? null),
    );
    const totalCommittedTtc = sumAllKnownOrNull(
      directLines.map((l) => l.committedAmountTtc ?? null),
    );
    const totalConsumedTtc = sumAllKnownOrNull(
      directLines.map((l) => l.consumedAmountTtc ?? null),
    );
    const totalRemainingTtc = sumAllKnownOrNull(
      directLines.map((l) => l.remainingAmountTtc ?? null),
    );
    const opexAmountTtc = sumAllKnownOrNull(
      directLines
        .filter((l) => l.expenseType === 'OPEX')
        .map((l) => l.revisedAmountTtc ?? null),
    );
    const capexAmountTtc = sumAllKnownOrNull(
      directLines
        .filter((l) => l.expenseType === 'CAPEX')
        .map((l) => l.revisedAmountTtc ?? null),
    );
    const percentOfBudget =
      totalBudgetRevised === 0 ? 0 : (totalRevised / totalBudgetRevised) * 100;

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
      totalRevised,
      totalCommitted,
      totalConsumed,
      totalRemaining,
      totalRevisedTtc,
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
    const totalRevised = orphanLines.reduce((s, l) => s + (l.revisedAmount ?? 0), 0);
    const totalCommitted = orphanLines.reduce((s, l) => s + (l.committedAmount ?? 0), 0);
    const totalConsumed = orphanLines.reduce((s, l) => s + (l.consumedAmount ?? 0), 0);
    const totalRemaining = orphanLines.reduce((s, l) => s + (l.remainingAmount ?? 0), 0);
    const opexAmount = orphanLines
      .filter((l) => l.expenseType === 'OPEX')
      .reduce((s, l) => s + (l.revisedAmount ?? 0), 0);
    const capexAmount = orphanLines
      .filter((l) => l.expenseType === 'CAPEX')
      .reduce((s, l) => s + (l.revisedAmount ?? 0), 0);
    const totalRevisedTtc = sumAllKnownOrNull(
      orphanLines.map((l) => l.revisedAmountTtc ?? null),
    );
    const totalCommittedTtc = sumAllKnownOrNull(
      orphanLines.map((l) => l.committedAmountTtc ?? null),
    );
    const totalConsumedTtc = sumAllKnownOrNull(
      orphanLines.map((l) => l.consumedAmountTtc ?? null),
    );
    const totalRemainingTtc = sumAllKnownOrNull(
      orphanLines.map((l) => l.remainingAmountTtc ?? null),
    );
    const opexAmountTtc = sumAllKnownOrNull(
      orphanLines
        .filter((l) => l.expenseType === 'OPEX')
        .map((l) => l.revisedAmountTtc ?? null),
    );
    const capexAmountTtc = sumAllKnownOrNull(
      orphanLines
        .filter((l) => l.expenseType === 'CAPEX')
        .map((l) => l.revisedAmountTtc ?? null),
    );
    const percentOfBudget =
      totalBudgetRevised === 0 ? 0 : (totalRevised / totalBudgetRevised) * 100;

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
      totalRevised,
      totalCommitted,
      totalConsumed,
      totalRemaining,
      totalRevisedTtc,
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
