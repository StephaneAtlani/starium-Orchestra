'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetListTable } from './budget-list-table';
import { BudgetStatusBadge } from './budget-status-badge';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetSummary } from '../types/budget-list.types';
import type { BudgetExerciseSummary } from '../types/budget-list.types';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (_) {
    return '—';
  }
}

interface BudgetsTableProps {
  data: BudgetSummary[];
  exerciseOptions: BudgetExerciseSummary[];
  dataTestId?: string;
}

/**
 * Table liste budgets (RFC-FE-003).
 * Action : Ouvrir → détail budget uniquement (pas "Voir dashboard" avant RFC-FE-002).
 */
export function BudgetsTable({
  data,
  exerciseOptions,
  dataTestId = 'budgets-table',
}: BudgetsTableProps) {
  const getExerciseLabel = (exerciseId: string): string => {
    const ex = exerciseOptions.find((e) => e.id === exerciseId);
    return ex ? ex.name : exerciseId;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <BudgetListTable<BudgetSummary>
          data-testid={dataTestId}
          columns={[
            {
              key: 'name',
              header: 'Nom',
              render: (row) => (
                <Link
                  href={budgetDetail(row.id)}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { key: 'code', header: 'Code', render: (row) => row.code ?? '—' },
            {
              key: 'exercise',
              header: 'Exercice',
              render: (row) => row.exerciseName ?? getExerciseLabel(row.exerciseId),
            },
            { key: 'currency', header: 'Devise', render: (row) => row.currency },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => <BudgetStatusBadge status={row.status} />,
            },
            {
              key: 'owner',
              header: 'Responsable',
              render: (row) => row.ownerUserName ?? '—',
            },
            {
              key: 'createdAt',
              header: 'Créé le',
              render: (row) => formatDate(row.createdAt),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <Link
                  href={budgetDetail(row.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                    'hover:bg-muted hover:text-foreground',
                  )}
                >
                  <ExternalLink className="size-4" />
                  Ouvrir
                </Link>
              ),
            },
          ]}
          data={data}
          keyExtractor={(row) => row.id}
          emptyMessage="Aucun budget."
        />
      </CardContent>
    </Card>
  );
}
