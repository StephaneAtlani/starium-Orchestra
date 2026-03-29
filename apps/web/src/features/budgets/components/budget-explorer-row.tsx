'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ExplorerLineNode, ExplorerNode } from '../types/budget-explorer.types';
import { formatPercent } from '../lib/budget-formatters';
import { BudgetLinesProgress } from './budget-lines-progress';
import { BudgetStatusBadge } from './budget-status-badge';
import { formatTaxAwareAmount, type TaxDisplayMode } from '@/lib/format-tax-aware-amount';

interface BudgetExplorerRowProps {
  node: ExplorerNode;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  currency: string;
  budgetId: string;
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
  budgetId,
  onBudgetLineClick,
  taxDisplayMode,
  budgetTaxMode,
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
            className="align-middle min-w-[260px] max-w-[28rem]"
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <div className="flex flex-wrap items-center gap-1">
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
                className="break-words font-medium text-primary hover:underline"
              >
                {env.name}
              </Link>
              {env.code && (
                <span className="shrink-0 text-muted-foreground text-xs">({env.code})</span>
              )}
            </div>
          </TableCell>
          <TableCell className="min-w-[7rem] whitespace-nowrap text-muted-foreground">
            —
          </TableCell>
          <TableCell className="min-w-[5.5rem] whitespace-nowrap">{env.envelopeType}</TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatTax(env.totalRevised, env.totalRevisedTtc)}
          </TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatPercent(env.percentOfBudget / 100)}
          </TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right">{env.lineCount}</TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatTax(env.opexAmount, env.opexAmountTtc)}
          </TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatTax(env.capexAmount, env.capexAmountTtc)}
          </TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatTax(env.totalCommitted, env.totalCommittedTtc)}
          </TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatTax(env.totalConsumed, env.totalConsumedTtc)}
          </TableCell>
          <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
            {formatTax(env.totalRemaining, env.totalRemainingTtc)}
          </TableCell>
          <TableCell className="min-w-[150px] w-[160px]">
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
              budgetId={budgetId}
              onBudgetLineClick={onBudgetLineClick}
              taxDisplayMode={taxDisplayMode}
              budgetTaxMode={budgetTaxMode}
            />
          ))}
      </>
    );
  }

  const line = node;
  return (
    <BudgetExplorerLineRow
      line={line}
      depth={depth}
      onBudgetLineClick={onBudgetLineClick}
      taxDisplayMode={taxDisplayMode}
      budgetTaxMode={budgetTaxMode}
    />
  );
}

interface BudgetExplorerLineRowProps {
  line: ExplorerLineNode;
  depth: number;
  onBudgetLineClick?: (lineId: string) => void;
  taxDisplayMode: TaxDisplayMode;
  budgetTaxMode: TaxDisplayMode;
}

function BudgetExplorerLineRow({
  line,
  depth,
  onBudgetLineClick,
  taxDisplayMode,
  budgetTaxMode,
}: BudgetExplorerLineRowProps) {
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
    <>
      <TableRow
        data-testid={`explorer-row-line-${line.id}`}
        className="hover:bg-muted/40"
      >
        <TableCell
          className="align-middle min-w-[260px] max-w-[28rem] text-foreground pl-0"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <BudgetStatusBadge
              status={line.status}
              className="h-5 px-2 text-[10px] uppercase"
            />
            <button
              type="button"
              onClick={() => onBudgetLineClick?.(line.id)}
              className={cn(
                'min-w-0 max-w-full text-left text-sm leading-snug break-words hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded',
                !onBudgetLineClick && 'cursor-default hover:no-underline',
              )}
              aria-label={`Ouvrir la ligne budgétaire ${line.name}`}
              disabled={!onBudgetLineClick}
            >
              {line.name}
            </button>
          </div>
        </TableCell>
        <TableCell className="min-w-[7rem] whitespace-nowrap text-muted-foreground">—</TableCell>
        <TableCell className="min-w-[5.5rem] whitespace-nowrap">{line.expenseType}</TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatTaxLine(line.revisedAmount, line.revisedAmountTtc, line.currency)}
        </TableCell>
        <TableCell className="min-w-[6.75rem]" />
        <TableCell className="min-w-[6.75rem]" />
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {line.expenseType === 'OPEX'
            ? formatTaxLine(
                line.revisedAmount,
                line.revisedAmountTtc,
                line.currency,
              )
            : '—'}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {line.expenseType === 'CAPEX'
            ? formatTaxLine(
                line.revisedAmount,
                line.revisedAmountTtc,
                line.currency,
              )
            : '—'}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatTaxLine(
            line.committedAmount,
            line.committedAmountTtc,
            line.currency,
          )}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatTaxLine(
            line.consumedAmount,
            line.consumedAmountTtc,
            line.currency,
          )}
        </TableCell>
        <TableCell className="min-w-[6.75rem] whitespace-nowrap text-right tabular-nums">
          {formatTaxLine(
            line.remainingAmount,
            line.remainingAmountTtc,
            line.currency,
          )}
        </TableCell>
        <TableCell className="min-w-[150px] w-[160px]">
          <BudgetLinesProgress
            revisedAmount={progressRevised}
            consumedAmount={progressConsumed}
            remainingAmount={progressRemaining}
            currency={line.currency}
            className="w-36"
          />
        </TableCell>
      </TableRow>
    </>
  );
}
