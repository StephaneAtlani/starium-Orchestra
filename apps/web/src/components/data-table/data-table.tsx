'use client';

/**
 * DataTable — tableau générique avec rendu cartes mobile (< md).
 *
 * **Double rendu CSS** : la table desktop et les cartes mobile coexistent dans le DOM
 * (l'une masquée par `hidden` / `md:hidden`). Chaque `cell(row)` est appelée **deux fois
 * par ligne** (table + carte).
 *
 * Les `cell(row)` doivent rester **pures et sans effet de bord** :
 * - pas d'`id` HTML fixe dans une cellule (collision DOM) ;
 * - pas de modale lourde montée deux fois sans contrôle ;
 * - pas de logique métier déclenchée au render ;
 * - pas de `useEffect` sensible dans un composant de cellule.
 *
 * Recommandation : dialogs en lazy mount (au clic), `useId()` si un id est requis.
 */
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { DataTableCard } from './data-table-card';
import {
  type DataTableColumn,
  renderCellContent,
} from './data-table.types';

export type { DataTableColumn, DataTableColumnPriority } from './data-table.types';

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  error?: Error | null;
  getRowId: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  /** Force le mode table même sur mobile (ex. tableaux très simples 2 colonnes) */
  forceTableOnMobile?: boolean;
  /** Annonce accessibilité du conteneur liste cartes */
  mobileCardsAriaLabel?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  error = null,
  getRowId,
  emptyTitle,
  emptyDescription,
  onRetry,
  forceTableOnMobile = false,
  mobileCardsAriaLabel = 'Liste des éléments',
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState rows={6} className="py-3" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message}
        onRetry={onRetry}
        className="my-4"
      />
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="py-12"
      />
    );
  }

  const tableView = (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={getRowId(row)}>
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {renderCellContent(col, row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (forceTableOnMobile) {
    return tableView;
  }

  return (
    <>
      <div className="hidden md:block">{tableView}</div>
      <ul
        role="list"
        aria-label={mobileCardsAriaLabel}
        className="space-y-3 md:hidden"
      >
        {data.map((row) => (
          <DataTableCard
            key={getRowId(row)}
            row={row}
            columns={columns}
          />
        ))}
      </ul>
    </>
  );
}
