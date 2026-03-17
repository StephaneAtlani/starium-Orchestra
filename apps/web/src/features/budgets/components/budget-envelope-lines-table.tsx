'use client';

import React from 'react';
import Link from 'next/link';
import type { BudgetEnvelopeLineItem } from '../types/budget-envelope-detail.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAmount } from '../lib/budget-formatters';
import { budgetLineEdit } from '../constants/budget-routes';

interface BudgetEnvelopeLinesTableProps {
  lines: BudgetEnvelopeLineItem[];
  isLoading: boolean;
  error?: unknown;
  total: number;
  offset: number;
  limit: number;
  onPageChange: (newOffset: number) => void;
}

export function BudgetEnvelopeLinesTable({
  lines,
  isLoading,
  error,
  total,
  offset,
  limit,
  onPageChange,
}: BudgetEnvelopeLinesTableProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Chargement des lignes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Impossible de charger les lignes budgétaires.
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Aucune ligne budgétaire.
      </div>
    );
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Initial</TableHead>
            <TableHead className="text-right">Révisé</TableHead>
            <TableHead className="text-right">Forecast</TableHead>
            <TableHead className="text-right">Engagé</TableHead>
            <TableHead className="text-right">Consommé</TableHead>
            <TableHead className="text-right">Restant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id} className="cursor-pointer">
              <TableCell className="font-mono text-xs">
                {line.code ?? '—'}
              </TableCell>
              <TableCell>
                <Link
                  href={budgetLineEdit(line.id)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {line.name}
                </Link>
              </TableCell>
              <TableCell>{line.status ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(line.initialAmount, line.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(line.revisedAmount, line.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(line.forecastAmount, line.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(line.committedAmount, line.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(line.consumedAmount, line.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(line.remainingAmount, line.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Lignes {offset + 1}–{Math.min(offset + limit, total)} sur {total}
        </div>
        <div className="space-x-2">
          <button
            type="button"
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={currentPage <= 1}
          >
            Précédent
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() =>
              onPageChange(
                currentPage >= pageCount ? offset : offset + limit,
              )
            }
            disabled={currentPage >= pageCount}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}

