'use client';

import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ExplorerNode, ExplorerSortColumn, ExplorerSortPreset } from '../types/budget-explorer.types';
import {
  explorerSortPresetToState,
  toggleExplorerSortColumn,
} from '../types/budget-explorer.types';
import { BudgetExplorerRow } from './budget-explorer-row';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';

type SortableColumn = Exclude<ExplorerSortColumn, 'default'>;

interface BudgetExplorerTableProps {
  nodes: ExplorerNode[];
  currency: string;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  budgetId: string;
  onBudgetLineClick?: (lineId: string) => void;
  taxDisplayMode: TaxDisplayMode;
  budgetTaxMode: TaxDisplayMode;
  sortPreset: ExplorerSortPreset;
  onSortPresetChange: (preset: ExplorerSortPreset) => void;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  /** true quand l’arbre affiché est filtré et vide (tree.length > 0 mais nodes.length === 0) */
  isFilteredEmpty?: boolean;
}

const DEFAULT_EMPTY = 'Aucune enveloppe.';
const DEFAULT_FILTERED_EMPTY = 'Aucun résultat pour ces filtres.';

function ExplorerSortableHead({
  label,
  column,
  sortPreset,
  onSortPresetChange,
  align = 'left',
  headClassName,
}: {
  label: string;
  column: SortableColumn;
  sortPreset: ExplorerSortPreset;
  onSortPresetChange: (preset: ExplorerSortPreset) => void;
  align?: 'left' | 'right';
  headClassName?: string;
}) {
  const state = explorerSortPresetToState(sortPreset);
  const active = state.column === column;
  const Icon = active ? (state.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className={cn(
        align === 'right' && 'text-right',
        !headClassName && align === 'right' && 'min-w-[6.75rem] whitespace-nowrap',
        active && 'text-foreground',
        headClassName,
      )}
    >
      <button
        type="button"
        className={cn(
          '-mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left font-medium hover:bg-muted/80 hover:text-foreground',
          align === 'right' && 'w-full justify-end text-right',
        )}
        onClick={() => onSortPresetChange(toggleExplorerSortColumn(sortPreset, column))}
        aria-sort={
          active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <span className="whitespace-nowrap">{label}</span>
        <Icon
          className={cn(
            'size-3.5 shrink-0',
            active ? 'text-primary' : 'text-muted-foreground opacity-60',
          )}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

export function BudgetExplorerTable({
  nodes,
  currency,
  expandedIds,
  onToggleExpand,
  budgetId,
  onBudgetLineClick,
  taxDisplayMode,
  budgetTaxMode,
  sortPreset,
  onSortPresetChange,
  emptyMessage = DEFAULT_EMPTY,
  emptyFilteredMessage = DEFAULT_FILTERED_EMPTY,
  isFilteredEmpty = false,
}: BudgetExplorerTableProps) {
  if (nodes.length === 0) {
    const msg = isFilteredEmpty ? emptyFilteredMessage : emptyMessage;
    return (
      <div
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid="budget-explorer-table-empty"
      >
        {msg}
      </div>
    );
  }

  return (
    <Table className="min-w-[1280px]" data-testid="budget-explorer-table">
      <TableHeader>
        <TableRow>
          <ExplorerSortableHead
            label="Sous-budget"
            column="name"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            headClassName="min-w-[260px] max-w-[28rem]"
          />
          <TableHead className="min-w-[7rem] whitespace-nowrap">Responsable</TableHead>
          <TableHead className="min-w-[5.5rem] whitespace-nowrap">Type</TableHead>
          <ExplorerSortableHead
            label="Budget"
            column="budget"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="% budget"
            column="percent"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="Lignes"
            column="lines"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="OPEX"
            column="opex"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="CAPEX"
            column="capex"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="Engagé"
            column="committed"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="Consommé"
            column="consumed"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <ExplorerSortableHead
            label="Solde"
            column="remaining"
            sortPreset={sortPreset}
            onSortPresetChange={onSortPresetChange}
            align="right"
          />
          <TableHead className="min-w-[150px] w-[160px] text-right pr-2">Progression</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {nodes.map((node) => (
          <BudgetExplorerRow
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            currency={currency}
            budgetId={budgetId}
            onBudgetLineClick={onBudgetLineClick}
            taxDisplayMode={taxDisplayMode}
            budgetTaxMode={budgetTaxMode}
          />
        ))}
      </TableBody>
    </Table>
  );
}
