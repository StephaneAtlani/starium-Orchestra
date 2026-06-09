'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface BudgetListTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface BudgetListTableProps<T> {
  columns: BudgetListTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  'data-testid'?: string;
}

/**
 * Table générique pour listes budget — simple, réutilisable, configurable.
 * Ne pas en faire un moteur de table / data-grid complexe.
 */
export function BudgetListTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Aucune donnée',
  'data-testid': dataTestId = 'budget-list-table',
}: BudgetListTableProps<T>) {
  return (
    <Table data-testid={dataTestId}>
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
        {data.length === 0 ? (
          <TableRow data-testid={`${dataTestId}-empty`}>
            <TableCell
              colSpan={columns.length}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow key={keyExtractor(row)}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
