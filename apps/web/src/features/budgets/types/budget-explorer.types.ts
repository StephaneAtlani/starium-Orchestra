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
  status: string;
  lineCount: number;
  totalRevised: number;
  totalCommitted: number;
  totalConsumed: number;
  totalRemaining: number;
  totalRevisedTtc: number | null;
  totalCommittedTtc: number | null;
  totalConsumedTtc: number | null;
  totalRemainingTtc: number | null;
  opexAmount: number;
  capexAmount: number;
  opexAmountTtc: number | null;
  capexAmountTtc: number | null;
  /** 0 si total révisé du budget = 0 */
  percentOfBudget: number;
  children: ExplorerNode[];
}

export interface ExplorerLineNode extends ExplorerNodeBase {
  type: 'line';
  code: string | null;
  name: string;
  expenseType: string;
  status: string;
  initialAmount: number;
  /** Présent si le budget est en mode TTC côté API. */
  initialAmountTtc: number | null;
  revisedAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  revisedAmountTtc: number | null;
  committedAmountTtc: number | null;
  consumedAmountTtc: number | null;
  remainingAmountTtc: number | null;
  currency: string;
  children: [];
}

export type ExplorerNode = ExplorerEnvelopeNode | ExplorerLineNode;

export interface BudgetExplorerFilters {
  search?: string;
  envelopeType?: string;
  expenseType?: string;
}

export type ExplorerSortColumn =
  | 'default'
  | 'name'
  | 'budget'
  | 'percent'
  | 'lines'
  | 'opex'
  | 'capex'
  | 'committed'
  | 'consumed'
  | 'remaining';

export type ExplorerSortDirection = 'asc' | 'desc';

export interface ExplorerSortState {
  column: ExplorerSortColumn;
  direction: ExplorerSortDirection;
}

export const DEFAULT_EXPLORER_SORT: ExplorerSortState = {
  column: 'default',
  direction: 'asc',
};

/** Valeur du Select « Tri » — parsée en `ExplorerSortState`. */
export type ExplorerSortPreset =
  | 'default'
  | 'name_asc'
  | 'name_desc'
  | 'budget_asc'
  | 'budget_desc'
  | 'percent_asc'
  | 'percent_desc'
  | 'lines_asc'
  | 'lines_desc'
  | 'opex_asc'
  | 'opex_desc'
  | 'capex_asc'
  | 'capex_desc'
  | 'committed_asc'
  | 'committed_desc'
  | 'consumed_asc'
  | 'consumed_desc'
  | 'remaining_asc'
  | 'remaining_desc';

export function explorerSortPresetToState(preset: ExplorerSortPreset): ExplorerSortState {
  if (preset === 'default') return DEFAULT_EXPLORER_SORT;
  const i = preset.lastIndexOf('_');
  const col = preset.slice(0, i) as ExplorerSortColumn;
  const dir = preset.slice(i + 1) as ExplorerSortDirection;
  return { column: col, direction: dir };
}

export function explorerSortStateToPreset(state: ExplorerSortState): ExplorerSortPreset {
  if (state.column === 'default') return 'default';
  return `${state.column}_${state.direction}` as ExplorerSortPreset;
}

/** Clic sur l’en-tête de colonne : bascule asc/desc si même colonne, sinon premier tri (nom ↑, montants ↓). */
export function toggleExplorerSortColumn(
  current: ExplorerSortPreset,
  column: Exclude<ExplorerSortColumn, 'default'>,
): ExplorerSortPreset {
  const s = explorerSortPresetToState(current);
  if (s.column === column) {
    return explorerSortStateToPreset({
      column,
      direction: s.direction === 'asc' ? 'desc' : 'asc',
    });
  }
  const direction: ExplorerSortDirection = column === 'name' ? 'asc' : 'desc';
  return explorerSortStateToPreset({ column, direction });
}

export interface BudgetExplorerData {
  budget: Budget;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
}
