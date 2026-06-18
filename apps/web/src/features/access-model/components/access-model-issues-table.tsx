'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import type { AccessModelIssue } from '../api/access-model.api';
import { moduleLabel } from '../lib/labels';

export function AccessModelIssuesTable({
  items,
  truncated,
  isLoading,
}: {
  items: AccessModelIssue[];
  truncated: boolean;
  isLoading: boolean;
}) {
  const columns = useMemo<DataTableColumn<AccessModelIssue>[]>(
    () => [
      {
        key: 'severity',
        header: 'Sévérité',
        mobilePriority: 'secondary',
        cell: (row) => (
          <Badge variant={row.severity === 'warning' ? 'destructive' : 'secondary'}>
            {row.severity === 'warning' ? 'Attention' : 'Info'}
          </Badge>
        ),
      },
      {
        key: 'label',
        header: 'Libellé',
        mobilePriority: 'primary',
        cell: (row) => (
          <div>
            <div className="font-medium">{row.label}</div>
            {row.subtitle ? (
              <p className="text-xs text-muted-foreground">{row.subtitle}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'module',
        header: 'Module',
        mobilePriority: 'secondary',
        cell: (row) => moduleLabel(row.module),
      },
      {
        key: 'actions',
        header: 'Action',
        mobilePriority: 'actions',
        cell: (row) => (
          <Button variant="ghost" size="sm" className="min-h-11" asChild>
            <Link href={row.correctiveAction.href}>
              {row.correctiveAction.label}
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Chargement des alertes…</p>
    );
  }

  return (
    <div className="space-y-2">
      {truncated && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Liste tronquée — affinez les filtres ou traitez les écarts par priorité.
        </p>
      )}
      <DataTable
        columns={columns}
        data={items}
        getRowId={(row) => row.id}
        mobileCardsAriaLabel="Alertes modèle d'accès"
        emptyTitle="Aucune alerte"
        emptyDescription="Aucune alerte pour cette catégorie avec les filtres actuels."
      />
    </div>
  );
}
