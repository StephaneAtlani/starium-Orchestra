'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { cn } from '@/lib/utils';
import type { ActionPlanApi } from '../types/project.types';
import {
  actionPlanOwnerLabel,
  fmtActionPlanShortDate,
} from '../lib/action-plan-display';
import { ActionPlanMetaBadges } from './action-plan-meta-badges';

function ActionPlanProgressCell({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const tone =
    clamped >= 100 ? 'ok' : clamped >= 40 ? 'muted' : 'warn';

  return (
    <div className="flex min-w-[7.5rem] items-center gap-1.5">
      <div className="starium-progress-track min-w-0 flex-1">
        <div
          className={cn('starium-progress-fill', `starium-progress-fill--${tone}`)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
        {percent} %
      </span>
    </div>
  );
}

export function ActionPlansListTable({ items }: { items: ActionPlanApi[] }) {
  const columns = useMemo<DataTableColumn<ActionPlanApi>[]>(
    () => [
      {
        key: 'title',
        header: 'Plan',
        mobilePriority: 'primary',
        cell: (plan) => (
          <div className="min-w-0 space-y-1">
            <Link
              href={`/action-plans/${plan.id}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {plan.title}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">{plan.code}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut & priorité',
        mobilePriority: 'secondary',
        cell: (plan) => <ActionPlanMetaBadges plan={plan} />,
      },
      {
        key: 'progress',
        header: 'Avancement',
        mobilePriority: 'secondary',
        cell: (plan) => <ActionPlanProgressCell percent={plan.progressPercent ?? 0} />,
      },
      {
        key: 'owner',
        header: 'Responsable',
        mobilePriority: 'secondary',
        cell: (plan) => (
          <span className="text-sm text-foreground">{actionPlanOwnerLabel(plan)}</span>
        ),
      },
      {
        key: 'dates',
        header: 'Échéance',
        mobilePriority: 'secondary',
        cell: (plan) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {fmtActionPlanShortDate(plan.targetDate)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(plan) => plan.id}
      mobileCardsAriaLabel="Liste des plans d'action"
    />
  );
}
