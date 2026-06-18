'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { WorkTeamStatusBadge } from './work-team-status-badge';
import type { WorkTeamDto } from '../types/work-team.types';

export function WorkTeamsTable({ items }: { items: WorkTeamDto[] }) {
  const columns = useMemo<DataTableColumn<WorkTeamDto>[]>(
    () => [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (t) => (
          <Link
            href={`/teams/structure/teams/${t.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.name}
          </Link>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        mobilePriority: 'secondary',
        cell: (t) => <span className="text-muted-foreground">{t.code ?? '—'}</span>,
      },
      {
        key: 'path',
        header: 'Chemin',
        mobilePriority: 'secondary',
        cell: (t) => (
          <span className="whitespace-normal break-words text-muted-foreground">{t.pathLabel}</span>
        ),
      },
      {
        key: 'lead',
        header: 'Responsable',
        mobilePriority: 'secondary',
        cell: (t) => t.leadDisplayName ?? '—',
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (t) => <WorkTeamStatusBadge status={t.status} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(t) => t.id}
      mobileCardsAriaLabel="Liste des équipes organisationnelles"
      emptyTitle="Aucune équipe"
      emptyDescription="Aucune équipe ne correspond à la recherche."
    />
  );
}
