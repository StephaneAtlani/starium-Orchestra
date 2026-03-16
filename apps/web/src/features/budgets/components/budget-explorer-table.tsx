'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ExplorerNode } from '../types/budget-explorer.types';
import { BudgetExplorerRow } from './budget-explorer-row';

interface BudgetExplorerTableProps {
  nodes: ExplorerNode[];
  currency: string;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedLineId?: string | null;
  onSelectLine?: (lineId: string) => void;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  /** true quand l’arbre affiché est filtré et vide (tree.length > 0 mais nodes.length === 0) */
  isFilteredEmpty?: boolean;
}

const DEFAULT_EMPTY = 'Aucune enveloppe.';
const DEFAULT_FILTERED_EMPTY = 'Aucun résultat pour ces filtres.';

export function BudgetExplorerTable({
  nodes,
  currency,
  expandedIds,
  onToggleExpand,
  selectedLineId,
  onSelectLine,
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
    <Table data-testid="budget-explorer-table">
      <TableHeader>
        <TableRow>
          <TableHead>Sous-budget</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">% budget</TableHead>
          <TableHead className="text-right">Lignes</TableHead>
          <TableHead className="text-right">OPEX</TableHead>
          <TableHead className="text-right">CAPEX</TableHead>
          <TableHead className="text-right">Engagé</TableHead>
          <TableHead className="text-right">Consommé</TableHead>
          <TableHead className="text-right">Solde</TableHead>
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
            selectedLineId={selectedLineId}
            onSelectLine={onSelectLine}
          />
        ))}
      </TableBody>
    </Table>
  );
}
