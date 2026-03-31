'use client';

import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { collectAllEnvelopeIds } from '../lib/filter-budget-tree';
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
  /** Développe toutes les enveloppes de l’arbre affiché. */
  onExpandAllEnvelopes?: () => void;
  /** Réduit toutes les enveloppes. */
  onCollapseAllEnvelopes?: () => void;
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
  prefix,
}: {
  label: string;
  column: SortableColumn;
  sortPreset: ExplorerSortPreset;
  onSortPresetChange: (preset: ExplorerSortPreset) => void;
  align?: 'left' | 'right';
  headClassName?: string;
  /** Ex. boutons tout développer / réduire les enveloppes (colonne Sous-budget). */
  prefix?: React.ReactNode;
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
      <div
        className={cn(
          'flex max-w-full items-center gap-1.5',
          align === 'right' && 'justify-end',
        )}
      >
        {prefix}
        <button
          type="button"
          className={cn(
            '-mx-1 inline-flex min-w-0 max-w-full flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left font-medium hover:bg-muted/80 hover:text-foreground',
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
      </div>
    </TableHead>
  );
}

function EnvelopeTreeBulkControls({
  onExpandAll,
  onCollapseAll,
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Enveloppes">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={onExpandAll}
        title="Tout développer"
        aria-label="Tout développer les enveloppes"
      >
        <ChevronsDown className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={onCollapseAll}
        title="Tout réduire"
        aria-label="Tout réduire les enveloppes"
      >
        <ChevronsUp className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

export function BudgetExplorerTable({
  nodes,
  expandedIds,
  onToggleExpand,
  onExpandAllEnvelopes,
  onCollapseAllEnvelopes,
  onBudgetLineClick,
  emptyMessage = DEFAULT_EMPTY,
  emptyFilteredMessage = DEFAULT_FILTERED_EMPTY,
  isFilteredEmpty = false,
  pilotage,
}: BudgetExplorerTableProps) {
  const isSynthese = pilotage.mode === 'synthese';
  const sortPreset = pilotage.sortPreset ?? 'default';
  const onSortPresetChange = pilotage.onSortPresetChange ?? (() => {});

  const envelopeCountForBulk = React.useMemo(
    () => collectAllEnvelopeIds(nodes).length,
    [nodes],
  );

  const bulkControls =
    onExpandAllEnvelopes &&
    onCollapseAllEnvelopes &&
    envelopeCountForBulk > 0 ? (
      <EnvelopeTreeBulkControls
        onExpandAll={onExpandAllEnvelopes}
        onCollapseAll={onCollapseAllEnvelopes}
      />
    ) : null;

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
              prefix={bulkControls}
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
          <TableHead className="min-w-[260px] max-w-[28rem]">
            <div className="flex items-center gap-1.5">
              {bulkControls}
              <span className="font-medium">Sous-budget</span>
            </div>
          </TableHead>
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
