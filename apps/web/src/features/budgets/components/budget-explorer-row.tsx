'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  LockOpen,
  Pencil,
} from 'lucide-react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExplorerLineNode, ExplorerNode } from '../types/budget-explorer.types';
import { formatPercent } from '../lib/budget-formatters';
import { budgetEnvelopeEdit, budgetLineEdit } from '../constants/budget-routes';
import { BudgetLinesProgress } from './budget-lines-progress';
import { usePermissions } from '@/hooks/use-permissions';
import { BudgetStatusBadge } from './budget-status-badge';
import { formatTaxAwareAmount, type TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BudgetLinePlanningGrid } from './budget-line-planning-grid';
import { BudgetLinePlanningToolbar } from './budget-line-planning-toolbar';
import { BudgetLinePlanningCalculatorPanel } from './budget-line-planning-calculator-panel';
import type { PlanningCalculatorTool } from './budget-line-planning-calculator-panel';
import type { ApiFormError } from '../api/types';
import { useInlineUpdateBudgetLine } from '../hooks/use-inline-update-budget-line';

interface BudgetExplorerRowProps {
  node: ExplorerNode;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  currency: string;
  budgetId: string;
  editableLineId?: string | null;
  onToggleEditable?: (lineId: string | null) => void;
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
  editableLineId,
  onToggleEditable,
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
    const canEditEnvelope = !isPermissionsLoading && has('budgets.update');
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
            className="w-10 min-w-10 p-2 align-middle"
            onClick={(e) => e.stopPropagation()}
          >
            {canEditEnvelope ? (
              <Link
                href={budgetEnvelopeEdit(env.id)}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'size-8 text-muted-foreground hover:text-foreground',
                )}
                aria-label={`Modifier l’enveloppe ${env.name}`}
              >
                <Pencil className="size-4 shrink-0" />
              </Link>
            ) : null}
          </TableCell>
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
              budgetId={budgetId}
              editableLineId={editableLineId}
              onToggleEditable={onToggleEditable}
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
      budgetId={budgetId}
      editableLineId={editableLineId}
      onToggleEditable={onToggleEditable}
      onBudgetLineClick={onBudgetLineClick}
      taxDisplayMode={taxDisplayMode}
      budgetTaxMode={budgetTaxMode}
    />
  );
}

interface BudgetExplorerLineRowProps {
  line: ExplorerLineNode;
  depth: number;
  budgetId: string;
  editableLineId?: string | null;
  onToggleEditable?: (lineId: string | null) => void;
  onBudgetLineClick?: (lineId: string) => void;
  taxDisplayMode: TaxDisplayMode;
  budgetTaxMode: TaxDisplayMode;
}

function BudgetExplorerLineRow({
  line,
  depth,
  budgetId,
  editableLineId,
  onToggleEditable,
  onBudgetLineClick,
  taxDisplayMode,
  budgetTaxMode,
}: BudgetExplorerLineRowProps) {
  const isEditable = editableLineId === line.id;
  const [draftName, setDraftName] = useState(line.name);
  const [draftRevisedAmount, setDraftRevisedAmount] = useState<number | ''>(
    line.revisedAmount ?? '',
  );
  const [draftExpenseType, setDraftExpenseType] = useState(line.expenseType);
  const [draftStatus, setDraftStatus] = useState(line.status);
  const inlineMutation = useInlineUpdateBudgetLine(line.id, budgetId);
  const { has, isLoading: isPermissionsLoading } = usePermissions();
  const canEditLine = !isPermissionsLoading && has('budgets.update');
  const canEdit = has('budgets.update');
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<PlanningCalculatorTool>('GROWTH');
  const [planningError, setPlanningError] = useState<ApiFormError | null>(null);

  const isApproximation = taxDisplayMode === 'TTC' && budgetTaxMode !== taxDisplayMode;
  const formatTaxLine = (htValue: number, ttcValue: number | null, c: string) =>
    formatTaxAwareAmount({ htValue, ttcValue, currency: c, mode: taxDisplayMode, isApproximation });

  const effExpense = isEditable ? draftExpenseType : line.expenseType;

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

  useEffect(() => {
    if (isEditable) {
      setDraftName(line.name);
      setDraftRevisedAmount(line.revisedAmount ?? '');
      setDraftExpenseType(line.expenseType);
      setDraftStatus(line.status);
    }
  }, [isEditable, line.name, line.revisedAmount, line.expenseType, line.status]);

  const handleSave = async () => {
    if (!canEdit) return;
    if (draftName.trim().length === 0) return;

    const payload = {
      name: draftName.trim(),
      revisedAmount:
        draftRevisedAmount === '' ? undefined : Number(draftRevisedAmount),
      expenseType: draftExpenseType,
      status: draftStatus,
    };

    await inlineMutation.mutateAsync(payload);
    onToggleEditable?.(null);
  };

  const handleToggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleEditable || !canEdit) return;
    if (isEditable) {
      await handleSave();
    } else {
      onToggleEditable(line.id);
    }
  };

  return (
    <>
      <TableRow
        data-testid={`explorer-row-line-${line.id}`}
        className={cn(isEditable ? 'bg-muted/60' : 'hover:bg-muted/40')}
      >
        <TableCell
          className="w-10 min-w-10 p-2 align-middle"
          onClick={(e) => e.stopPropagation()}
        >
          {canEditLine ? (
            <Link
              href={budgetLineEdit(line.id)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Modifier ${line.name}`}
            >
              <Pencil className="h-3 w-3" />
            </Link>
          ) : null}
        </TableCell>
        <TableCell
          className="align-middle text-foreground pl-0"
          style={{ paddingLeft: `${12 + (depth + 1) * 20}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isEditable && canEdit ? (
              <select
                className="flex h-6 shrink-0 rounded-md border border-input bg-background px-1.5 text-[10px] ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
              >
                <option value="DRAFT">Brouillon</option>
                <option value="ACTIVE">Actif</option>
                <option value="CLOSED">Clôturé</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            ) : (
              <BudgetStatusBadge
                status={line.status}
                className="h-5 px-2 text-[10px] uppercase"
              />
            )}
            {isEditable ? (
              <input
                className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            ) : (
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
            )}
            {canEdit && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsPlanningOpen(true)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Ouvrir le planning de la ligne"
                >
                  <Calculator className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={isEditable ? 'Verrouiller la ligne' : 'Déverrouiller la ligne'}
                >
                  {isEditable ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                </button>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex h-6 items-center justify-center rounded-md border border-input bg-background px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    disabled={inlineMutation.isPending}
                  >
                    {inlineMutation.isPending ? (
                      'Enreg.'
                    ) : (
                      <>
                        <Check className="mr-1 size-3" />
                        Enreg.
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">—</TableCell>
        <TableCell>
          {isEditable && canEdit ? (
            <select
              className="flex h-8 w-28 rounded-lg border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draftExpenseType}
              onChange={(e) => setDraftExpenseType(e.target.value)}
            >
              <option value="OPEX">OPEX</option>
              <option value="CAPEX">CAPEX</option>
            </select>
          ) : (
            effExpense
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {isEditable ? (
            <input
              className="h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm"
              type="number"
              step="0.01"
              min={0}
              value={draftRevisedAmount}
              onChange={(e) =>
                setDraftRevisedAmount(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          ) : (
            formatTaxLine(line.revisedAmount, line.revisedAmountTtc, line.currency)
          )}
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell className="text-right tabular-nums">
          {effExpense === 'OPEX'
            ? formatTaxLine(
                line.revisedAmount,
                line.revisedAmountTtc,
                line.currency,
              )
            : '—'}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {effExpense === 'CAPEX'
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

      <Dialog
        open={isPlanningOpen}
        onOpenChange={(open) => {
          setIsPlanningOpen(open);
          if (!open) {
            setPlanningError(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Planning de la ligne</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {line.code ? `${line.code} — ${line.name}` : line.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {planningError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Erreur de planning : {planningError.message ?? 'une erreur est survenue.'}
              </div>
            )}
            <BudgetLinePlanningToolbar
              canEdit={canEdit}
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
            />
            <div className="grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div>
                <BudgetLinePlanningGrid
                  lineId={line.id}
                  budgetId={budgetId}
                  currency={line.currency}
                  canEdit={canEdit}
                  onError={(err) => setPlanningError(err)}
                />
              </div>
              <BudgetLinePlanningCalculatorPanel
                lineId={line.id}
                budgetId={budgetId}
                currency={line.currency}
                selectedTool={selectedTool}
                canEdit={canEdit}
                onError={(err) => setPlanningError(err)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
