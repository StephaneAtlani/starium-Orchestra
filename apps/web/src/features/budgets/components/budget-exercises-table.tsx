'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { BudgetStatusBadge } from './budget-status-badge';
import { budgetExerciseDetail, budgetListWithExercise } from '../constants/budget-routes';
import type { BudgetExerciseSummary } from '../types/budget-list.types';
import { List, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '../lib/budget-formatters';

interface BudgetExercisesTableProps {
  data: BudgetExerciseSummary[];
  /** @see data-testid */
  dataTestId?: string;
}

/**
 * Table liste exercices budgétaires (RFC-FE-003).
 * Actions : Voir les budgets ; Ouvrir (détail exercice existe).
 */
export function BudgetExercisesTable({
  data,
  dataTestId = 'budget-exercises-table',
}: BudgetExercisesTableProps) {
  const columns = useMemo<DataTableColumn<BudgetExerciseSummary>[]>(
    () => [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (row) => (
          <Link
            href={budgetExerciseDetail(row.id)}
            className="font-medium text-primary hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        mobilePriority: 'secondary',
        cell: (row) => row.code ?? '—',
      },
      {
        key: 'period',
        header: 'Période',
        mobilePriority: 'secondary',
        cell: (row) => `${formatDate(row.startDate)} → ${formatDate(row.endDate)}`,
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (row) => <BudgetStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={budgetListWithExercise(row.id)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                'hover:bg-muted hover:text-foreground',
              )}
            >
              <List className="size-4" />
              Voir les budgets
            </Link>
            <Link
              href={budgetExerciseDetail(row.id)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                'hover:bg-muted hover:text-foreground',
              )}
            >
              <ExternalLink className="size-4" />
              Ouvrir
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Card data-testid={dataTestId}>
      <CardContent className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={data}
          getRowId={(row) => row.id}
          mobileCardsAriaLabel="Liste des exercices budgétaires"
          emptyTitle="Aucun exercice"
          emptyDescription="Aucun exercice ne correspond aux filtres."
        />
      </CardContent>
    </Card>
  );
}
