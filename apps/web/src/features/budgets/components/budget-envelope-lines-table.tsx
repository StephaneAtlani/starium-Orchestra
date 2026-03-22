'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BudgetEnvelopeLineItem } from '../types/budget-envelope-detail.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { formatAmount } from '../lib/budget-formatters';
import { budgetLineEdit } from '../constants/budget-routes';
import {
  BUDGET_LINE_STATUS_SELECT_OPTIONS,
  budgetLineStatusFilterLabel,
  budgetLineStatusLabel,
} from '../constants/budget-line-status-options';
import { cn } from '@/lib/utils';
import {
  cockpitTableHeadRow,
  cockpitTdFirst,
  cockpitTdNum,
  cockpitTdNumLast,
  cockpitTdText,
  cockpitTdEndRight,
  cockpitThEndLeft,
  cockpitThEndRight,
  cockpitThFirst,
  cockpitThNum,
  cockpitThText,
} from '../dashboard/components/budget-cockpit-table-classes';

function lineLabel(code: string | null | undefined, name: string) {
  return code ? `${code} — ${name}` : name;
}

function lineStatusBadgeVariant(
  status: string | null | undefined,
): 'default' | 'secondary' | 'outline' {
  if (!status) return 'outline';
  if (status === 'ACTIVE') return 'default';
  if (status === 'DRAFT') return 'secondary';
  return 'outline';
}

interface BudgetEnvelopeLinesTableProps {
  lines: BudgetEnvelopeLineItem[];
  isLoading: boolean;
  error?: unknown;
  total: number;
  offset: number;
  limit: number;
  onPageChange: (newOffset: number) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  /** Pour le libellé vide : résultats filtrés vs enveloppe sans lignes */
  hasActiveFilters: boolean;
  /** Clic sur la ligne → panneau intelligence ligne (drawer) */
  onBudgetLineClick?: (lineId: string) => void;
}

export function BudgetEnvelopeLinesTable({
  lines,
  isLoading,
  error,
  total,
  offset,
  limit,
  onPageChange,
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  hasActiveFilters,
  onBudgetLineClick,
}: BudgetEnvelopeLinesTableProps) {
  if (error) {
    return (
      <div className="px-5 py-10 text-center text-sm text-destructive">
        Impossible de charger les lignes budgétaires.
      </div>
    );
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const showEmpty = !lines.length;

  return (
    <div className="space-y-0">
      <div className="border-b border-border/70 px-4 py-3 sm:px-5">
        <TableToolbar className="py-0">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Input
              placeholder="Rechercher (code, libellé)…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm min-w-[12rem]"
              data-testid="envelope-lines-search"
              aria-label="Filtrer les lignes par texte"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => onStatusFilterChange(v ?? 'ALL')}
            >
              <SelectTrigger
                size="sm"
                className="min-w-[11rem] max-w-[min(100%,14rem)]"
                data-testid="envelope-lines-status"
              >
                <SelectValue placeholder="Statut">
                  {budgetLineStatusFilterLabel(statusFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BUDGET_LINE_STATUS_SELECT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TableToolbar>
      </div>

      {isLoading && lines.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          Chargement des lignes…
        </div>
      ) : showEmpty ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          {total === 0 && !hasActiveFilters
            ? 'Aucune ligne budgétaire dans cette enveloppe.'
            : 'Aucun résultat pour ces critères. Modifiez la recherche ou le statut.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[1120px] table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[8rem]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[5.5rem]" />
            </colgroup>
            <TableHeader className="bg-transparent">
              <TableRow className={cockpitTableHeadRow}>
                <TableHead className={cn('min-w-0', cockpitThFirst)}>
                  Ligne
                </TableHead>
                <TableHead className={cockpitThEndLeft}>Statut</TableHead>
                <TableHead className={cockpitThNum}>Initial</TableHead>
                <TableHead className={cockpitThNum}>Révisé</TableHead>
                <TableHead className={cockpitThNum}>Forecast</TableHead>
                <TableHead className={cockpitThNum}>Engagé</TableHead>
                <TableHead className={cockpitThNum}>Consommé</TableHead>
                <TableHead className={cockpitThNum}>Restant</TableHead>
                <TableHead className={cockpitThEndRight}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const label = lineLabel(line.code, line.name);
                return (
                  <TableRow
                    key={line.id}
                    className={cn(
                      'border-border',
                      onBudgetLineClick &&
                        'cursor-pointer hover:bg-muted/50',
                    )}
                    onClick={
                      onBudgetLineClick
                        ? () => onBudgetLineClick(line.id)
                        : undefined
                    }
                  >
                    <TableCell className={cn(cockpitTdFirst, 'max-w-0')}>
                      <span
                        className={cn(
                          'block truncate',
                          onBudgetLineClick &&
                            'text-primary underline-offset-4 hover:underline',
                        )}
                        title={label}
                      >
                        {label}
                      </span>
                    </TableCell>
                    <TableCell className={cn(cockpitTdText, 'whitespace-nowrap')}>
                      {line.status ? (
                        <Badge
                          variant={lineStatusBadgeVariant(line.status)}
                          className="font-normal"
                        >
                          {budgetLineStatusLabel(line.status)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                      {formatAmount(line.initialAmount, line.currency)}
                    </TableCell>
                    <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                      {formatAmount(line.revisedAmount, line.currency)}
                    </TableCell>
                    <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                      {formatAmount(line.forecastAmount, line.currency)}
                    </TableCell>
                    <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                      {formatAmount(line.committedAmount, line.currency)}
                    </TableCell>
                    <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                      {formatAmount(line.consumedAmount, line.currency)}
                    </TableCell>
                    <TableCell className={cn(cockpitTdNum, 'whitespace-nowrap')}>
                      {formatAmount(line.remainingAmount, line.currency)}
                    </TableCell>
                    <TableCell
                      className={cockpitTdEndRight}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onBudgetLineClick ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                          onClick={() => onBudgetLineClick(line.id)}
                          aria-label={`Ouvrir la ligne ${label}`}
                        >
                          Éditer
                        </button>
                      ) : (
                        <Link
                          href={budgetLineEdit(line.id)}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Éditer
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading ? (
        <div className="flex flex-col gap-2 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted-foreground tabular-nums">
            {total === 0
              ? '0 ligne'
              : `Lignes ${offset + 1}–${Math.min(offset + limit, total)} sur ${total}`}
            {pageCount > 1 ? ` · Page ${currentPage} / ${pageCount}` : null}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={currentPage <= 1}
              aria-label="Page précédente"
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onPageChange(
                  currentPage >= pageCount ? offset : offset + limit,
                )
              }
              disabled={currentPage >= pageCount}
              aria-label="Page suivante"
            >
              Suivant
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

