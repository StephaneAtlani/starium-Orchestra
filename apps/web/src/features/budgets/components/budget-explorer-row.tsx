'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ExplorerNode } from '../types/budget-explorer.types';
import { formatAmount, formatPercent } from '../lib/budget-formatters';
import { BudgetLinesProgress } from './budget-lines-progress';
import { usePermissions } from '@/hooks/use-permissions';

interface BudgetExplorerRowProps {
  node: ExplorerNode;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  currency: string;
  selectedLineId?: string | null;
  onSelectLine?: (lineId: string) => void;
}

/** expandedIds ne contient que des ids d’enveloppes. */
export function BudgetExplorerRow({
  node,
  depth,
  expandedIds,
  onToggleExpand,
  currency,
  selectedLineId,
  onSelectLine,
}: BudgetExplorerRowProps) {
  const isEnvelope = node.type === 'envelope';
  const isExpanded = isEnvelope && expandedIds.has(node.id);
  const hasChildren = isEnvelope && node.children.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand(id);
    }
  };

  if (node.type === 'envelope') {
    const env = node;
    return (
      <>
        <TableRow data-testid={`explorer-row-envelope-${env.id}`}>
          <TableCell
            className="align-middle"
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <div className="flex items-center gap-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(env.id)}
                  onKeyDown={(e) => handleKeyDown(e, env.id)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? `Réduire ${env.name}` : `Développer ${env.name}`}
                  className="rounded p-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              ) : (
                <span className="w-5" aria-hidden />
              )}
              <span className="font-medium">{env.name}</span>
              {env.code && (
                <span className="text-muted-foreground text-xs">({env.code})</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell>{env.envelopeType}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatAmount(env.totalRevised, currency)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatPercent(env.percentOfBudget / 100)}
          </TableCell>
          <TableCell className="text-right">{env.lineCount}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatAmount(env.opexAmount, currency)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatAmount(env.capexAmount, currency)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatAmount(env.totalCommitted, currency)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatAmount(env.totalConsumed, currency)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatAmount(env.totalRemaining, currency)}
          </TableCell>
        </TableRow>
        {isExpanded &&
          hasChildren &&
          env.children.map((child) => (
            <BudgetExplorerRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              currency={currency}
              selectedLineId={selectedLineId}
              onSelectLine={onSelectLine}
            />
          ))}
      </>
    );
  }

  const line = node;
  return (
    <TableRow
      data-testid={`explorer-row-line-${line.id}`}
      className={cn(
        'cursor-pointer hover:bg-muted/60',
        selectedLineId === line.id && 'bg-muted',
      )}
      onClick={() => {
        // Debug clic ligne budget explorer
        // eslint-disable-next-line no-console
        console.debug('[BudgetExplorerRow] line click', { id: line.id, name: line.name });
        onSelectLine?.(line.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectLine?.(line.id);
        }
      }}
      tabIndex={0}
      aria-selected={selectedLineId === line.id}
    >
      <TableCell
        className="align-middle text-foreground"
        style={{ paddingLeft: `${12 + (depth + 1) * 20}px` }}
      >
        <span className="text-sm truncate">{line.name}</span>
      </TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell>{line.expenseType}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatAmount(line.revisedAmount, line.currency)}
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell className="text-right tabular-nums">
        {line.expenseType === 'OPEX'
          ? formatAmount(line.revisedAmount, line.currency)
          : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {line.expenseType === 'CAPEX'
          ? formatAmount(line.revisedAmount, line.currency)
          : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatAmount(line.committedAmount, line.currency)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatAmount(line.consumedAmount, line.currency)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-end gap-1">
          <span className="tabular-nums font-medium">
            {formatAmount(line.remainingAmount, line.currency)}
          </span>
          <BudgetLinesProgress
            revisedAmount={line.revisedAmount}
            consumedAmount={line.consumedAmount}
            remainingAmount={line.remainingAmount}
            currency={line.currency}
            className="w-32"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
