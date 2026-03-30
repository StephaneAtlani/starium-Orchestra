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
import type { ExplorerNode } from '../types/budget-explorer.types';
import {
  explorerSortPresetToState,
  toggleExplorerSortColumn,
  type ExplorerSortColumn,
  type ExplorerSortPreset,
} from '../types/budget-explorer.types';
import { BudgetExplorerRow } from './budget-explorer-row';
import { getBudgetPilotageColumnHeaders } from '../lib/budget-table-columns.factory';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '../types/budget-pilotage.types';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';
import type { Amounts12 } from '../lib/budget-planning-grid';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';

export interface BudgetExplorerPilotageBindings {
  mode: BudgetPilotageMode;
  density: BudgetPilotageDensity;
  monthColumnLabels: string[];
  planningByLineId: Map<string, BudgetLinePlanningResponse>;
  planningQueriesLoading: boolean;
  planningFetchedLineIds: readonly string[];
  amounts12ByLineId: Map<string, Amounts12 | null>;
  draftAmounts12ByLineId: Record<string, Amounts12 | undefined>;
  mutatingLineId: string | null;
  canEditPlanning: boolean;
  onMonthCommit: (lineId: string, monthIndex0: number, amount: number) => void;
  /** Mode synthèse : tri + affichage TTC/HT */
  sortPreset?: ExplorerSortPreset;
  onSortPresetChange?: (preset: ExplorerSortPreset) => void;
  currency?: string;
  budgetTaxMode?: TaxDisplayMode;
  taxDisplayMode?: TaxDisplayMode;
}

interface BudgetExplorerTableProps {
  nodes: ExplorerNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onBudgetLineClick?: (lineId: string) => void;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  isFilteredEmpty?: boolean;
  pilotage: BudgetExplorerPilotageBindings;
}

const DEFAULT_EMPTY = 'Aucune enveloppe.';
const DEFAULT_FILTERED_EMPTY = 'Aucun résultat pour ces filtres.';

type SortableColumn = Exclude<ExplorerSortColumn, 'default'>;

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
  expandedIds,
  onToggleExpand,
  onBudgetLineClick,
  emptyMessage = DEFAULT_EMPTY,
  emptyFilteredMessage = DEFAULT_FILTERED_EMPTY,
  isFilteredEmpty = false,
  pilotage,
}: BudgetExplorerTableProps) {
  const isSynthese = pilotage.mode === 'synthese';
  const sortPreset = pilotage.sortPreset ?? 'default';
  const onSortPresetChange = pilotage.onSortPresetChange ?? (() => {});

  const headers = isSynthese
    ? []
    : getBudgetPilotageColumnHeaders(
        pilotage.mode,
        pilotage.density,
        pilotage.monthColumnLabels,
      );
  const dataColCount = headers.length;

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

  const tableMinW = isSynthese
    ? 'min-w-[1280px]'
    : pilotage.mode === 'previsionnel' && pilotage.density === 'mensuel'
      ? 'min-w-[2200px]'
      : 'min-w-[1280px]';

  if (isSynthese) {
    return (
      <Table className={cn(tableMinW)} data-testid="budget-explorer-table">
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
              onBudgetLineClick={onBudgetLineClick}
              pilotage={pilotage}
              pilotageDataColCount={dataColCount}
            />
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table className={cn(tableMinW)} data-testid="budget-explorer-table">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[260px] max-w-[28rem]">Sous-budget</TableHead>
          {headers.map((h) => (
            <TableHead
              key={h.id}
              className={cn(
                'whitespace-nowrap',
                h.align === 'right' && 'text-right min-w-[6.75rem]',
              )}
            >
              {h.label}
            </TableHead>
          ))}
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
            onBudgetLineClick={onBudgetLineClick}
            pilotage={pilotage}
            pilotageDataColCount={dataColCount}
          />
        ))}
      </TableBody>
    </Table>
  );
}
