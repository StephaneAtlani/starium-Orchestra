'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { BudgetStatusBadge } from './budget-status-badge';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetSummary, BudgetExerciseSummary } from '../types/budget-list.types';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveClient } from '@/hooks/use-active-client';
import { saveBudgetCockpitSelection } from '@/features/budgets/lib/budget-cockpit-selection-storage';

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
  const { activeClient } = useActiveClient();

  const persistCockpitSelection = (row: BudgetSummary) => {
    if (!activeClient?.id) return;
    saveBudgetCockpitSelection(activeClient.id, {
      exerciseId: row.exerciseId,
      budgetId: row.id,
    });
  };

  const getExerciseLabel = (exerciseId: string): string => {
    const ex = exerciseOptions.find((e) => e.id === exerciseId);
    return ex ? ex.name : exerciseId;
  };

  const columns = useMemo<DataTableColumn<BudgetSummary>[]>(
    () => [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (row) => (
          <Link
            href={budgetDetail(row.id)}
            className="font-medium text-primary hover:underline"
            onClick={() => persistCockpitSelection(row)}
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
        key: 'exercise',
        header: 'Exercice',
        mobilePriority: 'secondary',
        cell: (row) => row.exerciseName ?? getExerciseLabel(row.exerciseId),
      },
      {
        key: 'currency',
        header: 'Devise',
        mobilePriority: 'secondary',
        cell: (row) => row.currency,
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (row) => <BudgetStatusBadge status={row.status} />,
      },
      {
        key: 'owner',
        header: 'Responsable',
        mobilePriority: 'secondary',
        cell: (row) => row.ownerUserName ?? '—',
      },
      {
        key: 'createdAt',
        header: 'Créé le',
        mobilePriority: 'secondary',
        cell: (row) => formatDate(row.createdAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (row) => (
          <Link
            href={budgetDetail(row.id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-sm',
              'hover:bg-muted hover:text-foreground',
            )}
            onClick={() => persistCockpitSelection(row)}
          >
            <ExternalLink className="size-4" />
            Ouvrir
          </Link>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exerciseOptions labels
    [exerciseOptions, activeClient?.id],
  );

  return (
    <Card data-testid={dataTestId}>
      <CardContent className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={data}
          getRowId={(row) => row.id}
          mobileCardsAriaLabel="Liste des budgets"
          emptyTitle="Aucun budget"
          emptyDescription="Aucun budget ne correspond aux filtres."
        />
      </CardContent>
    </Card>
  );
}
