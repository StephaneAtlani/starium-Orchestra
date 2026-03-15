/**
 * Types pour l’explorateur budgétaire (RFC-FE-004).
 * Arbre hiérarchique Enveloppes / Lignes — types discriminés.
 */

import type { Budget, BudgetEnvelope, BudgetLine } from './budget-management.types';

export interface ExplorerNodeBase {
  id: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
}

export interface ExplorerEnvelopeNode extends ExplorerNodeBase {
  type: 'envelope';
  name: string;
  code: string | null;
  envelopeType: string;
  lineCount: number;
  totalRevised: number;
  totalCommitted: number;
  totalConsumed: number;
  totalRemaining: number;
  opexAmount: number;
  capexAmount: number;
  /** 0 si total révisé du budget = 0 */
  percentOfBudget: number;
  children: ExplorerNode[];
}

export interface ExplorerLineNode extends ExplorerNodeBase {
  type: 'line';
  code: string | null;
  name: string;
  expenseType: string;
  revisedAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  currency: string;
  children: [];
}

export type ExplorerNode = ExplorerEnvelopeNode | ExplorerLineNode;

export interface BudgetExplorerFilters {
  search?: string;
  envelopeType?: string;
  expenseType?: string;
}

export interface BudgetExplorerData {
  budget: Budget;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
}
