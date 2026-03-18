'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ExplorerNode } from '../types/budget-explorer.types';
import { formatPercent } from '../lib/budget-formatters';
import { BudgetLinesProgress } from './budget-lines-progress';
import { usePermissions } from '@/hooks/use-permissions';
import { BudgetStatusBadge } from './budget-status-badge';
import { formatTaxAwareAmount, type TaxDisplayMode } from '@/lib/format-tax-aware-amount';

interface BudgetExplorerRowProps {
  node: ExplorerNode;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  currency: string;
  onBudgetLineClick?: (lineId: string) => void;
  taxDisplayMode: TaxDisplayMode;
  budgetTaxMode: TaxDisplayMode;
}

/** expandedIds ne contient que des ids d’enveloppes. */
export function BudgetExplorerRow({
  node,
  depth,
  expandedIds,
  onToggleExpand,
  currency,
  onBudgetLineClick,
  taxDisplayMode,
  budgetTaxMode,
}: BudgetExplorerRowProps) {
  const { has, isLoading: isPermissionsLoading } = usePermissions();
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
    const progressRevised =
      taxDisplayMode === 'TTC' && env.totalRevisedTtc != null
        ? env.totalRevisedTtc
        : env.totalRevised;
    const progressConsumed =
      taxDisplayMode === 'TTC' && env.totalConsumedTtc != null
        ? env.totalConsumedTtc
        : env.totalConsumed;
    const progressRemaining =
      taxDisplayMode === 'TTC' && env.totalRemainingTtc != null
        ? env.totalRemainingTtc
        : env.totalRemaining;

    const isApproximation = taxDisplayMode === 'TTC' && budgetTaxMode !== taxDisplayMode;
    const formatTax = (htValue: number, ttcValue: number | null) =>
      formatTaxAwareAmount({
        htValue,
        ttcValue,
        currency,
        mode: taxDisplayMode,
        isApproximation,
      });

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
              <Link
                href={`/budget-envelopes/${env.id}`}
                className="font-medium text-primary hover:underline"
              >
                {env.name}
              </Link>
              {env.code && (
                <span className="text-muted-foreground text-xs">({env.code})</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell>{env.envelopeType}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatTax(env.totalRevised, env.totalRevisedTtc)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatPercent(env.percentOfBudget / 100)}
          </TableCell>
          <TableCell className="text-right">{env.lineCount}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatTax(env.opexAmount, env.opexAmountTtc)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatTax(env.capexAmount, env.capexAmountTtc)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatTax(env.totalCommitted, env.totalCommittedTtc)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatTax(env.totalConsumed, env.totalConsumedTtc)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatTax(env.totalRemaining, env.totalRemainingTtc)}
          </TableCell>
          <TableCell className="w-[160px]">
            <BudgetLinesProgress
              revisedAmount={progressRevised}
              consumedAmount={progressConsumed}
              remainingAmount={progressRemaining}
              currency={currency}
              className="w-36"
            />
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
              onBudgetLineClick={onBudgetLineClick}
              taxDisplayMode={taxDisplayMode}
              budgetTaxMode={budgetTaxMode}
            />
          ))}
      </>
    );
  }

  const line = node;
  const canEditLine = !isPermissionsLoading && has('budgets.update');
  const isApproximation = taxDisplayMode === 'TTC' && budgetTaxMode !== taxDisplayMode;
  const formatTaxLine = (htValue: number, ttcValue: number | null, c: string) =>
    formatTaxAwareAmount({ htValue, ttcValue, currency: c, mode: taxDisplayMode, isApproximation });

  const progressRevised =
    taxDisplayMode === 'TTC' && line.revisedAmountTtc != null
      ? line.revisedAmountTtc
      : line.revisedAmount;
  const progressConsumed =
    taxDisplayMode === 'TTC' && line.consumedAmountTtc != null
      ? line.consumedAmountTtc
      : line.consumedAmount;
  const progressRemaining =
    taxDisplayMode === 'TTC' && line.remainingAmountTtc != null
      ? line.remainingAmountTtc
      : line.remainingAmount;

  return (
    <TableRow data-testid={`explorer-row-line-${line.id}`}>
      <TableCell
        className="align-middle text-foreground"
        style={{ paddingLeft: `${12 + (depth + 1) * 20}px` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BudgetStatusBadge
              status={line.status}
              className="h-5 px-2 text-[10px] uppercase"
            />
            <button
              type="button"
              onClick={() => onBudgetLineClick?.(line.id)}
              className={cn(
                'text-left text-sm truncate hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded',
                !onBudgetLineClick && 'cursor-default hover:no-underline',
              )}
              aria-label={`Ouvrir la ligne budgétaire ${line.name}`}
              disabled={!onBudgetLineClick}
            >
              {line.name}
            </button>
          </div>
          {canEditLine && (
            <Link
              href={`/budget-lines/${line.id}/edit`}
              className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Modifier ${line.name}`}
            >
              <Pencil className="h-3 w-3" />
            </Link>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell>{line.expenseType}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTaxLine(line.revisedAmount, line.revisedAmountTtc, line.currency)}
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell className="text-right tabular-nums">
        {line.expenseType === 'OPEX'
          ? formatTaxLine(
              line.revisedAmount,
              line.revisedAmountTtc,
              line.currency,
            )
          : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {line.expenseType === 'CAPEX'
          ? formatTaxLine(
              line.revisedAmount,
              line.revisedAmountTtc,
              line.currency,
            )
          : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTaxLine(
          line.committedAmount,
          line.committedAmountTtc,
          line.currency,
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTaxLine(
          line.consumedAmount,
          line.consumedAmountTtc,
          line.currency,
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTaxLine(
          line.remainingAmount,
          line.remainingAmountTtc,
          line.currency,
        )}
      </TableCell>
      <TableCell className="w-[160px]">
        <BudgetLinesProgress
          revisedAmount={progressRevised}
          consumedAmount={progressConsumed}
          remainingAmount={progressRemaining}
          currency={line.currency}
          className="w-36"
        />
      </TableCell>
    </TableRow>
  );
}
