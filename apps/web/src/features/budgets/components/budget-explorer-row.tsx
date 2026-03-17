'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Lock, LockOpen, Check } from 'lucide-react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ExplorerNode } from '../types/budget-explorer.types';
import { formatAmount, formatPercent } from '../lib/budget-formatters';
import { BudgetLinesProgress } from './budget-lines-progress';
import { BudgetStatusBadge } from './budget-status-badge';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionGate } from '@/components/PermissionGate';
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
import { useRouter } from 'next/navigation';
import { budgetLines } from '../constants/budget-routes';

interface BudgetExplorerRowProps {
  node: ExplorerNode;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  currency: string;
  budgetId: string;
  editableLineId?: string | null;
  onToggleEditable?: (lineId: string | null) => void;
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
}: BudgetExplorerRowProps) {
  const isEnvelope = node.type === 'envelope';
  const router = useRouter();

  if (node.type === 'envelope') {
    const env = node;
    return (
      <TableRow
        data-testid={`explorer-row-envelope-${env.id}`}
        className="cursor-pointer hover:bg-muted/40"
        onClick={() => {
          router.push(budgetLines(budgetId));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push(budgetLines(budgetId));
          }
        }}
        tabIndex={0}
      >
        <TableCell className="align-middle">
          <BudgetStatusBadge
            status={env.status}
            className="h-5 px-1.5 text-[10px]"
          />
        </TableCell>
        <TableCell
          className="align-middle"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <div className="flex items-center gap-1">
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
    );
  }

  const line = node;
  const isEditable = editableLineId === line.id;
  const [draftName, setDraftName] = useState(line.name);
  const [draftRevisedAmount, setDraftRevisedAmount] = useState<number | ''>(
    line.revisedAmount ?? '',
  );
  const [draftExpenseType, setDraftExpenseType] = useState(line.expenseType);
  const [draftStatus, setDraftStatus] = useState(line.status);
  const inlineMutation = useInlineUpdateBudgetLine(line.id, budgetId);
  const { has } = usePermissions();
  const canEdit = has('budgets.update');
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<PlanningCalculatorTool>('GROWTH');
  const [planningError, setPlanningError] = useState<ApiFormError | null>(null);

  useEffect(() => {
    if (isEditable) {
      setDraftName(line.name);
      setDraftRevisedAmount(line.revisedAmount ?? '');
      setDraftExpenseType(line.expenseType);
      setDraftStatus(line.status);
    }
  }, [isEditable, line.name, line.revisedAmount, line.expenseType, line.status]);

  const handleToggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleEditable || !canEdit) return;
    if (isEditable) {
      await handleSave();
    } else {
      onToggleEditable(line.id);
    }
  };

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

  return (
    <>
      <TableRow
        data-testid={`explorer-row-line-${line.id}`}
        className={cn(
          isEditable ? 'bg-muted/60' : 'hover:bg-muted/40',
        )}
      >
        <TableCell className="align-middle">
          {isEditable && canEdit ? (
            <select
              className="flex h-6 rounded-md border border-input bg-background px-1.5 text-[10px] ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              className="h-5 px-1.5 text-[10px]"
            />
          )}
        </TableCell>
        <TableCell
          className="align-middle text-foreground"
          style={{ paddingLeft: `${12 + (depth + 1) * 20}px` }}
        >
          <div className="flex items-center gap-2">
            {isEditable ? (
              <input
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            ) : (
              <span className="text-sm truncate">{line.name}</span>
            )}
            {canEdit && (
              <div className="flex items-center gap-1">
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
            draftExpenseType ?? line.expenseType
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
            formatAmount(line.revisedAmount, line.currency)
          )}
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
        <TableCell className="text-right align-middle">
          <PermissionGate
            permission="budgets.read"
            showWhileLoading
          >
            <button
              type="button"
              className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                setPlanningError(null);
                setIsPlanningOpen(true);
              }}
            >
              Planning
            </button>
          </PermissionGate>
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
