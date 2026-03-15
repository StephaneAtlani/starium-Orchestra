'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetListTable } from './budget-list-table';
import { BudgetStatusBadge } from './budget-status-badge';
import { budgetExerciseDetail, budgetListWithExercise } from '../constants/budget-routes';
import type { BudgetExerciseSummary } from '../types/budget-list.types';
import { List, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  return (
    <Card>
      <CardContent className="p-0">
        <BudgetListTable<BudgetExerciseSummary>
          data-testid={dataTestId}
          columns={[
            {
              key: 'name',
              header: 'Nom',
              render: (row) => (
                <Link
                  href={budgetExerciseDetail(row.id)}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { key: 'code', header: 'Code', render: (row) => row.code ?? '—' },
            {
              key: 'period',
              header: 'Période',
              render: (row) => `${row.startDate} → ${row.endDate}`,
            },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => <BudgetStatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-1">
                  <Link
                    href={budgetListWithExercise(row.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                      'hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <List className="size-4" />
                    Voir les budgets
                  </Link>
                  <Link
                    href={budgetExerciseDetail(row.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                      'hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <ExternalLink className="size-4" />
                    Ouvrir
                  </Link>
                </div>
              ),
            },
          ]}
          data={data}
          keyExtractor={(row) => row.id}
          emptyMessage="Aucun exercice."
        />
      </CardContent>
    </Card>
  );
}
