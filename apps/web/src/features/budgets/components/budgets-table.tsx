'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { BudgetStatusBadge } from './budget-status-badge';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveClient } from '@/hooks/use-active-client';
import { saveBudgetCockpitSelection } from '@/features/budgets/lib/budget-cockpit-selection-storage';

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(rate: number | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${Math.round(rate * 100)} %`;
}

interface BudgetsTableProps {
  data: BudgetListItemWithKpi[];
  exerciseId: string;
  dataTestId?: string;
}

/**
 * Table liste budgets (RFC-FE-003).
 * Action : Ouvrir → détail budget uniquement (pas "Voir dashboard" avant RFC-FE-002).
 */
export function BudgetsTable({
  data,
  exerciseId,
  dataTestId = 'budgets-table',
}: BudgetsTableProps) {
  const { activeClient } = useActiveClient();

  const persistCockpitSelection = (row: BudgetListItemWithKpi) => {
    if (!activeClient?.id) return;
    saveBudgetCockpitSelection(activeClient.id, {
      exerciseId,
      budgetId: row.budget.id,
    });
  };

  const columns = useMemo<DataTableColumn<BudgetListItemWithKpi>[]>(
    () => [
      {
        key: 'name',
        header: 'Budget',
        mobilePriority: 'primary',
        cell: (row) => (
          <Link
            href={budgetDetail(row.budget.id)}
            className="font-medium text-primary hover:underline"
            onClick={() => persistCockpitSelection(row)}
          >
            {row.budget.name}
          </Link>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        mobilePriority: 'secondary',
        cell: (row) => row.budget.code ?? '—',
      },
      {
        key: 'allocated',
        header: 'Alloué',
        mobilePriority: 'secondary',
        cell: (row) => formatAmount(row.kpi.totalInitialAmount, row.kpi.currency ?? row.budget.currency),
      },
      {
        key: 'committed',
        header: 'Engagé',
        mobilePriority: 'secondary',
        cell: (row) => formatAmount(row.kpi.totalCommittedAmount, row.kpi.currency ?? row.budget.currency),
      },
      {
        key: 'consumed',
        header: 'Consommé',
        mobilePriority: 'secondary',
        cell: (row) => formatAmount(row.kpi.totalConsumedAmount, row.kpi.currency ?? row.budget.currency),
      },
      {
        key: 'remaining',
        header: 'Reste',
        mobilePriority: 'secondary',
        cell: (row) => formatAmount(row.kpi.totalRemainingAmount, row.kpi.currency ?? row.budget.currency),
      },
      {
        key: 'execution',
        header: 'Exécution',
        mobilePriority: 'secondary',
        cell: (row) => formatPercent(row.kpi.consumptionRate),
      },
      {
        key: 'status',
        header: 'État',
        mobilePriority: 'secondary',
        cell: (row) => <BudgetStatusBadge status={row.budget.status as any} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (row) => (
          <Link
            href={budgetDetail(row.budget.id)}
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
    [activeClient?.id],
  );

  return (
    <Card data-testid={dataTestId}>
      <CardContent className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={data}
          getRowId={(row) => row.budget.id}
          mobileCardsAriaLabel="Liste des budgets"
          emptyTitle="Aucun budget"
          emptyDescription="Aucun budget ne correspond aux filtres."
        />
      </CardContent>
    </Card>
  );
}
